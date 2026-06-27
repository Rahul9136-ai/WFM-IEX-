// Excel (xlsx) bulk schedule import/export for the roster.
import * as XLSX from 'xlsx'
import { QUEUES, TEAMS } from '../data/seed.js'

const DASH = '–' // en-dash — must match the shift parser in planning.js

// Map a free-text skill cell to canonical queue ids (accepts id or name).
function normaliseSkills(cell) {
  if (!cell) return []
  return String(cell)
    .split(/[,;/|]+/)
    .map((s) => s.trim().toLowerCase())
    .map((s) => {
      const q = QUEUES.find((q) => q.id === s || q.name.toLowerCase() === s || q.name.toLowerCase().startsWith(s))
      return q?.id
    })
    .filter(Boolean)
}

const HHMM = (v) => {
  if (v == null) return null
  // Excel may hand back a fraction-of-day number for time cells
  if (typeof v === 'number') {
    const mins = Math.round(v * 24 * 60)
    return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
  }
  const m = String(v).trim().match(/^(\d{1,2}):(\d{2})/)
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : null
}

const pick = (row, keys) => {
  for (const k of Object.keys(row)) {
    const norm = k.toLowerCase().replace(/[^a-z]/g, '')
    if (keys.includes(norm)) return row[k]
  }
  return undefined
}

// Parse an uploaded workbook into a roster. Returns { agents, errors }.
export async function parseScheduleFile(file) {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { cellDates: false })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
  const agents = []
  const errors = []
  rows.forEach((row, i) => {
    const name = pick(row, ['name', 'agent', 'agentname', 'fullname'])
    const start = HHMM(pick(row, ['shiftstart', 'start', 'starttime', 'login'])
      ?? (pick(row, ['shift']) ? String(pick(row, ['shift'])).split(/[-–—]/)[0] : ''))
    const end = HHMM(pick(row, ['shiftend', 'end', 'endtime', 'logout'])
      ?? (pick(row, ['shift']) ? String(pick(row, ['shift'])).split(/[-–—]/)[1] : ''))
    const skills = normaliseSkills(pick(row, ['skills', 'skill', 'queues', 'queue']))
    const team = pick(row, ['team']) || 'Imported'
    if (!name || !start || !end) { errors.push(`Row ${i + 2}: missing name/shift`); return }
    if (!skills.length) { errors.push(`Row ${i + 2}: no recognised skills (use sales/support/billing)`); return }
    agents.push({
      id: pick(row, ['agentid', 'id', 'eid']) ? String(pick(row, ['agentid', 'id', 'eid'])) : 'imp' + (i + 1),
      name: String(name),
      skills,
      shift: `${start}${DASH}${end}`,
      team: String(team),
      tl: pick(row, ['tl', 'teamlead', 'teamleader', 'supervisor']) || TEAMS[team]?.tl || 'Unassigned',
    })
  })
  return { agents, errors }
}

// Download a pre-filled template (the current roster) for the user to edit.
export function downloadTemplate(agents) {
  const data = agents.map((a) => ({
    'Agent ID': a.id,
    Name: a.name,
    Skills: a.skills.join(', '),
    'Shift Start': a.shift.split(DASH)[0],
    'Shift End': a.shift.split(DASH)[1],
    Team: a.team,
    TL: a.tl ?? '',
  }))
  const ws = XLSX.utils.json_to_sheet(data)
  ws['!cols'] = [{ wch: 9 }, { wch: 18 }, { wch: 20 }, { wch: 11 }, { wch: 11 }, { wch: 10 }, { wch: 14 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Schedule')
  XLSX.writeFile(wb, 'wfm-schedule-template.xlsx')
}
