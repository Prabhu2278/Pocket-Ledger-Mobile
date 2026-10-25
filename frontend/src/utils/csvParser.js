/**
 * csvParser.js - Robust CSV Parser for Bank Statements & Transaction Ledgers
 * Enforces mandatory data fields: Date, Type, Category, Wallet, Amount (Note is optional)
 */

// Splits a CSV line handling quoted values with commas
export function splitCsvLine(line) {
  const values = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"' || char === "'") {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim().replace(/^["']|["']$/g, ''))
      current = ''
    } else {
      current += char
    }
  }
  values.push(current.trim().replace(/^["']|["']$/g, ''))
  return values
}

/**
 * Validates that the CSV headers contain all mandatory columns matching the transaction table:
 * Date, Type (or Debit/Credit), Category, Wallet (or Account), and Amount.
 */
export function validateCsvHeaders(headers) {
  const missing = []
  const normHeaders = headers.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''))

  const hasDate = normHeaders.some((h) =>
    ['date', 'txndate', 'transactiondate', 'spent_on', 'received_on', 'dateoftransaction'].includes(h)
  )

  const hasDebitCredit =
    normHeaders.some((h) => ['debit', 'dr'].includes(h)) ||
    normHeaders.some((h) => ['credit', 'cr'].includes(h))

  const hasType =
    normHeaders.some((h) => ['type', 'transactiontype', 'category_type'].includes(h)) ||
    hasDebitCredit

  const hasCategory = normHeaders.some((h) =>
    ['category', 'cat', 'tag', 'categoryname'].includes(h)
  )

  const hasWallet = normHeaders.some((h) =>
    ['wallet', 'walletname', 'account', 'accountname', 'targetwallet', 'wallet_id', 'walletid'].includes(h)
  )

  const hasAmount =
    normHeaders.some((h) => ['amount', 'amt', 'total', 'value'].includes(h)) ||
    hasDebitCredit

  if (!hasDate) missing.push('Date')
  if (!hasType) missing.push('Type')
  if (!hasCategory) missing.push('Category')
  if (!hasWallet) missing.push('Wallet')
  if (!hasAmount) missing.push('Amount')

  return {
    isValid: missing.length === 0,
    missingColumns: missing,
  }
}

export function parseCsvText(csvText, defaultWallet = null, availableWallets = [], availableCategories = []) {
  if (!csvText || typeof csvText !== 'string') return []

  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length < 2) {
    const emptyResult = []
    emptyResult.error = 'CSV file is empty or does not contain data rows.'
    emptyResult.headerValidation = { isValid: false, missingColumns: ['All'] }
    return emptyResult
  }

  const rawHeaders = splitCsvLine(lines[0])
  const headerValidation = validateCsvHeaders(rawHeaders)

  // If mandatory columns are missing from the header, return with validation error
  if (!headerValidation.isValid) {
    const invalidResult = []
    invalidResult.error = `Missing required column(s): ${headerValidation.missingColumns.join(', ')}. Your CSV must include Date, Type, Category, Wallet, and Amount columns to match the transaction table.`
    invalidResult.headerValidation = headerValidation
    return invalidResult
  }

  const headers = rawHeaders.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''))
  const results = []

  // Initialize running balances map from availableWallets to track balances sequentially
  const runningBalances = {}
  if (Array.isArray(availableWallets)) {
    availableWallets.forEach((w) => {
      const bal = Number(w.current_balance ?? w.balance ?? w.initial_balance ?? 0)
      runningBalances[String(w.id)] = bal
    })
  }

  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i])
    if (values.length === 0 || values.every((v) => !v)) continue

    const row = {}
    headers.forEach((h, idx) => {
      row[h] = values[idx] || ''
    })

    // 1. Resolve Date (MANDATORY)
    const rawDate = (
      row.date ||
      row.txndate ||
      row.transactiondate ||
      row.spent_on ||
      row.received_on ||
      row.dateoftransaction ||
      ''
    ).trim()

    let dateStr = ''
    if (rawDate) {
      if (rawDate.includes('-')) {
        const parts = rawDate.split('-')
        if (parts[0].length === 4) {
          dateStr = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`
        } else if (parts[2].length === 4) {
          dateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
        } else {
          dateStr = rawDate
        }
      } else if (rawDate.includes('/')) {
        const parts = rawDate.split('/')
        if (parts.length === 3) {
          if (parts[2].length === 4) {
            dateStr = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`
          } else if (parts[0].length === 4) {
            dateStr = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`
          }
        }
      } else {
        dateStr = rawDate
      }
    }

    // 2. Resolve Amount & Type (MANDATORY)
    let type = ''
    let rawAmount = 0
    const debitVal = parseFloat(row.debit || row.dr || 0)
    const creditVal = parseFloat(row.credit || row.cr || 0)

    if (creditVal > 0) {
      type = 'income'
      rawAmount = creditVal
    } else if (debitVal > 0) {
      type = 'expense'
      rawAmount = debitVal
    } else {
      const amtStr = row.amount || row.amt || row.total || row.value || ''
      const parsed = parseFloat(amtStr.replace(/[^0-9.-]/g, ''))
      if (!isNaN(parsed) && amtStr !== '') {
        if (parsed < 0) {
          type = 'expense'
          rawAmount = Math.abs(parsed)
        } else {
          rawAmount = parsed
          const explicitType = (row.type || row.transactiontype || row.category_type || '').toLowerCase().trim()
          if (
            explicitType.includes('inc') ||
            explicitType.includes('cr') ||
            explicitType.includes('deposit') ||
            explicitType.includes('credit')
          ) {
            type = 'income'
          } else if (
            explicitType.includes('exp') ||
            explicitType.includes('dr') ||
            explicitType.includes('withdrawal') ||
            explicitType.includes('debit')
          ) {
            type = 'expense'
          } else {
            type = 'expense'
          }
        }
      }
    }

    // 3. Resolve Category (MANDATORY)
    const rawCategory = (
      row.category ||
      row.cat ||
      row.tag ||
      row.categoryname ||
      ''
    ).trim()

    let matchedCategory = rawCategory
    let isCategoryListed = false

    if (rawCategory && Array.isArray(availableCategories) && availableCategories.length > 0) {
      const matched = availableCategories.find(
        (c) =>
          c.name.trim().toLowerCase() === rawCategory.toLowerCase() &&
          (!type || c.type.toLowerCase() === type.toLowerCase())
      ) || availableCategories.find(
        (c) => c.name.trim().toLowerCase() === rawCategory.toLowerCase()
      )

      if (matched) {
        matchedCategory = matched.name
        isCategoryListed = true
      }
    }

    // 4. Resolve Note (OPTIONAL)
    const note = (
      row.note ||
      row.description ||
      row.desc ||
      row.title ||
      row.particulars ||
      row.memo ||
      row.details ||
      row.narration ||
      ''
    ).trim()

    // 5. Resolve Wallet (MANDATORY)
    const rawWallet = (
      row.wallet ||
      row.walletname ||
      row.account ||
      row.accountname ||
      row.targetwallet ||
      row.wallet_id ||
      row.walletid ||
      ''
    ).trim()

    let wallet_id = null
    let wallet_name = rawWallet
    let isWalletMissing = false
    let matchedWallet = null

    if (rawWallet && Array.isArray(availableWallets) && availableWallets.length > 0) {
      matchedWallet = availableWallets.find(
        (w) =>
          String(w.id) === rawWallet ||
          w.name.trim().toLowerCase() === rawWallet.toLowerCase()
      )

      if (matchedWallet) {
        wallet_id = matchedWallet.id
        wallet_name = matchedWallet.name
      } else {
        isWalletMissing = true
      }
    } else {
      isWalletMissing = true
    }

    // Sequential running balance calculation per wallet:
    // If wallet has 1000 and two expenses (700 and 800) arrive:
    // 1st expense takes 700, leaving 300.
    // 2nd expense requires 800 > 300, so it fails with Insufficient Wallet Funds!
    let isInsufficientBalance = false
    let currentAvailable = 0

    if (matchedWallet) {
      const wKey = String(matchedWallet.id)
      if (!(wKey in runningBalances)) {
        runningBalances[wKey] = Number(
          matchedWallet.current_balance ??
          matchedWallet.balance ??
          matchedWallet.initial_balance ??
          0
        )
      }
      currentAvailable = runningBalances[wKey]

      if (type === 'income') {
        runningBalances[wKey] = currentAvailable + rawAmount
      } else if (type === 'expense' || type === 'transfer') {
        if (rawAmount > currentAvailable) {
          isInsufficientBalance = true
        } else {
          runningBalances[wKey] = currentAvailable - rawAmount
        }
      }
    }

    // Check mandatory fields (Date, Type, Category, Wallet, Amount; Note is optional)
    const missing = []
    if (!dateStr) missing.push('Date')
    if (!type) missing.push('Type')
    if (!matchedCategory) missing.push('Category')
    if (!wallet_id || isWalletMissing) missing.push('Wallet')
    if (!rawAmount || rawAmount <= 0) missing.push('Amount')
    if (isInsufficientBalance) missing.push('Insufficient Wallet Funds')

    const isRowValid = missing.length === 0

    results.push({
      id: i,
      date: dateStr,
      type: type || 'expense',
      amount: rawAmount,
      category: matchedCategory,
      rawCategory: rawCategory,
      isCategoryListed: isCategoryListed,
      note: note,
      rawWallet: rawWallet,
      wallet_id: wallet_id,
      wallet_name: wallet_name,
      wallet_balance: currentAvailable,
      isWalletMissing: isWalletMissing,
      isInsufficientBalance: isInsufficientBalance,
      isValid: isRowValid,
      missingFields: missing,
    })
  }

  results.headerValidation = headerValidation
  return results
}

/**
 * Re-evaluates an existing list of parsed rows sequentially using fresh wallet balances.
 * Useful after creating a wallet or adding an income in the import modal.
 */
export function recalculateRowsWithRunningBalance(rows, availableWallets = []) {
  if (!Array.isArray(rows) || rows.length === 0) return []

  const runningBalances = {}
  if (Array.isArray(availableWallets)) {
    availableWallets.forEach((w) => {
      runningBalances[String(w.id)] = Number(w.current_balance ?? w.balance ?? w.initial_balance ?? 0)
    })
  }

  return rows.map((r) => {
    let matchedWallet = null
    if (r.wallet_id && Array.isArray(availableWallets)) {
      matchedWallet = availableWallets.find((w) => String(w.id) === String(r.wallet_id))
    } else if (r.wallet_name && Array.isArray(availableWallets)) {
      matchedWallet = availableWallets.find(
        (w) => w.name.trim().toLowerCase() === String(r.wallet_name).trim().toLowerCase()
      )
    } else if (r.rawWallet && Array.isArray(availableWallets)) {
      matchedWallet = availableWallets.find(
        (w) => String(w.id) === String(r.rawWallet) || w.name.trim().toLowerCase() === String(r.rawWallet).trim().toLowerCase()
      )
    }

    const walletId = matchedWallet ? matchedWallet.id : r.wallet_id
    const walletName = matchedWallet ? matchedWallet.name : r.wallet_name
    const isWalletMissing = !matchedWallet && !walletId

    let isInsufficientBalance = false
    let currentAvailable = 0

    if (walletId && !isWalletMissing) {
      const wKey = String(walletId)
      if (!(wKey in runningBalances)) {
        runningBalances[wKey] = matchedWallet
          ? Number(matchedWallet.current_balance ?? matchedWallet.balance ?? matchedWallet.initial_balance ?? 0)
          : Number(r.wallet_balance ?? 0)
      }
      currentAvailable = runningBalances[wKey]

      const amt = Number(r.amount || 0)
      if (r.type === 'income') {
        runningBalances[wKey] = currentAvailable + amt
      } else if (r.type === 'expense' || r.type === 'transfer') {
        if (amt > currentAvailable) {
          isInsufficientBalance = true
        } else {
          runningBalances[wKey] = currentAvailable - amt
        }
      }
    }

    const missing = []
    if (!r.date) missing.push('Date')
    if (!r.type) missing.push('Type')
    if (!r.category) missing.push('Category')
    if (!walletId || isWalletMissing) missing.push('Wallet')
    if (!r.amount || Number(r.amount) <= 0) missing.push('Amount')
    if (isInsufficientBalance) missing.push('Insufficient Wallet Funds')

    return {
      ...r,
      wallet_id: walletId,
      wallet_name: walletName,
      wallet_balance: currentAvailable,
      isWalletMissing,
      isInsufficientBalance,
      isValid: missing.length === 0,
      missingFields: missing,
    }
  })
}

export default parseCsvText
