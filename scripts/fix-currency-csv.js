const fs = require('fs')
const path = require('path')

const CSV_PATH = path.join(__dirname, '..', 'Untitled spreadsheet - Sheet1.csv')

const safeTrim = (value) =>
  typeof value === 'string' ? value.trim().replace(/\uFEFF/g, '') : ''

const parseCsv = (content) => {
  const rows = []
  let current = []
  let value = ''
  let inQuotes = false

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i]

    if (char === '"') {
      if (inQuotes && content[i + 1] === '"') {
        value += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      current.push(value)
      value = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && content[i + 1] === '\n') {
        i += 1
      }
      current.push(value)
      rows.push(current)
      current = []
      value = ''
      continue
    }

    value += char
  }

  if (value.length > 0 || current.length > 0) {
    current.push(value)
    rows.push(current)
  }

  return rows
}

const toCsv = (rows) => {
  const escapeCell = (cell) => {
    const needsQuotes = /[",\r\n]/.test(cell)
    const escaped = cell.replace(/"/g, '""')
    return needsQuotes ? `"${escaped}"` : escaped
  }

  return rows
    .map((row) => row.map((cell) => escapeCell(cell ?? '')).join(','))
    .join('\r\n')
}

const formatThousands = (value) =>
  value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')

const convertDotDecimalToThousands = (value) => {
  const match = /^Rp([0-9]+)\.([0-9]{1,2})$/.exec(value)
  if (!match) return null

  const numericValue = Number(`${match[1]}.${match[2]}`)
  if (Number.isNaN(numericValue)) return null

  const scaled = Math.round(numericValue * 1000)
  return `Rp${formatThousands(scaled)}`
}

const fixCurrencyValue = (raw) => {
  const trimmed = safeTrim(raw)
  if (!trimmed || !trimmed.startsWith('Rp')) {
    return raw
  }

  const collapsed = trimmed.replace(/\s+/g, '')

  const commaDecimalMatch = /^Rp([0-9]+),([0-9]{1,2})$/.exec(collapsed)
  if (commaDecimalMatch) {
    const dotForm = `Rp${commaDecimalMatch[1]}.${commaDecimalMatch[2].padEnd(2, '0')}`
    const converted = convertDotDecimalToThousands(dotForm)
    return converted || dotForm
  }

  const dotDecimalMatch = /^Rp([0-9]+)\.([0-9]{1,2})$/.exec(collapsed)
  if (dotDecimalMatch) {
    const converted = convertDotDecimalToThousands(`Rp${dotDecimalMatch[1]}.${dotDecimalMatch[2]}`)
    if (converted) return converted
  }

  return trimmed
}

const main = () => {
  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(`CSV file not found at ${CSV_PATH}`)
  }

  const content = fs.readFileSync(CSV_PATH, 'utf8')
  const rows = parseCsv(content)
  if (rows.length === 0) {
    throw new Error('CSV file is empty')
  }

  const headerRow = rows[0].map((header, index) => {
    const trimmed = safeTrim(header)
    if (!trimmed) return index === 0 ? 'RowNumber' : `H${index}`
    return trimmed
  })

  const financeIdx = headerRow.findIndex((header) => header === 'Cost (Finance)')
  const gaIdx = headerRow.findIndex((header) => header === 'Cost (GA & Supply Chain)')

  if (financeIdx === -1 || gaIdx === -1) {
    throw new Error('Unable to locate currency columns in CSV')
  }

  let fixedCount = 0

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i]
    if (!row || row.length === 0) continue

    const financeValue = row[financeIdx] ?? ''
    const gaValue = row[gaIdx] ?? ''

    const newFinanceValue = fixCurrencyValue(financeValue)
    const newGaValue = fixCurrencyValue(gaValue)

    if (newFinanceValue !== financeValue) {
      row[financeIdx] = newFinanceValue
      fixedCount += 1
    }

    if (newGaValue !== gaValue) {
      row[gaIdx] = newGaValue
      fixedCount += 1
    }
  }

  fs.writeFileSync(CSV_PATH, toCsv(rows), 'utf8')
  console.log(`Saved updated CSV. Adjusted ${fixedCount} currency values.`)
}

try {
  main()
} catch (error) {
  console.error('Failed to normalize CSV currency values:', error.message)
  process.exitCode = 1
}
