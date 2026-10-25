import React, { useState, useEffect, useMemo } from 'react'
import { parseCsvText, recalculateRowsWithRunningBalance } from '../utils/csvParser'
import { money } from '../utils/formatCurrency'
import { categoryApi } from '../api/categoryApi'
import { walletApi } from '../api/walletApi'
import { transactionApi } from '../api/transactionApi'
import { CustomDropdown } from './ui/CustomDropdown/CustomDropdown'
import { CustomDatePicker } from './ui/CustomDatePicker/CustomDatePicker'

export function CsvImportModal({
  isOpen,
  onClose,
  onImportConfirm,
  currency = 'INR',
  wallets = [],
  categories = [],
  refreshCategories,
  showToast,
  addWallet,
  refreshWallets,
}) {
  const [file, setFile] = useState(null)
  const [rawText, setRawText] = useState('')
  const [parsedRows, setParsedRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  // Local state for wallets & categories
  const [localWallets, setLocalWallets] = useState(wallets)
  const [localCategories, setLocalCategories] = useState(categories)

  // Sub-modal state for creating missing wallet with 0 initial balance
  // { row: object, walletName: string, error: string }
  const [walletPrompt, setWalletPrompt] = useState(null)
  const [walletCreating, setWalletCreating] = useState(false)

  // Sub-modal state for "Did you forget to add an income?"
  // { row, walletId, walletName, walletBalance, amountNeeded, amount, category, note, date, error }
  const [addIncomePrompt, setAddIncomePrompt] = useState(null)
  const [incomeCreating, setIncomeCreating] = useState(false)

  // Synchronize localWallets with wallets prop
  useEffect(() => {
    if (wallets && wallets.length > 0) {
      setLocalWallets(wallets)
    }
  }, [wallets])

  // Fetch freshest wallets directly from API when modal opens
  useEffect(() => {
    if (isOpen) {
      walletApi
        .getWallets()
        .then((wList) => {
          if (Array.isArray(wList) && wList.length > 0) {
            setLocalWallets(wList)
          }
        })
        .catch(() => {})
    }
  }, [isOpen])

  // Synchronize localCategories with categories prop
  useEffect(() => {
    if (categories && categories.length > 0) {
      setLocalCategories(categories)
    }
  }, [categories])

  // Scroll Lock
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open')
      document.documentElement.classList.add('modal-open')
    }
    return () => {
      document.body.classList.remove('modal-open')
      document.documentElement.classList.remove('modal-open')
    }
  }, [isOpen])

  // Re-evaluate parsed rows whenever localWallets or localCategories change
  useEffect(() => {
    if (!rawText) return
    const rows = parseCsvText(rawText, null, localWallets, localCategories)
    if (rows.headerValidation?.isValid && rows.length > 0) {
      setParsedRows((prevRows) => {
        if (prevRows.length > 0 && prevRows.length < rows.length) {
          const remainingIds = new Set(prevRows.map((p) => p.id))
          const remaining = rows.filter((r) => remainingIds.has(r.id))
          return recalculateRowsWithRunningBalance(remaining, localWallets)
        }
        return rows
      })
    }
  }, [localWallets, localCategories, rawText])

  // Detect unlisted categories from the CSV that do not yet exist in the DB / Settings
  const newCategoriesFromCsv = useMemo(() => {
    const newMap = new Map()
    const existingLower = new Set(localCategories.map((c) => c.name.toLowerCase()))

    parsedRows.forEach((r) => {
      const catName = (r.category || r.rawCategory || '').trim()
      if (!catName) return
      if (!existingLower.has(catName.toLowerCase()) && !newMap.has(catName.toLowerCase())) {
        newMap.set(catName.toLowerCase(), {
          name: catName,
          type: r.type || 'expense',
        })
      }
    })
    return Array.from(newMap.values())
  }, [parsedRows, localCategories])

  // Available income categories for the Add Income dialog
  const incomeCategoryOptions = useMemo(() => {
    const list = localCategories.filter((c) => (c.type || '').toLowerCase() === 'income')
    if (list.length === 0) {
      return [{ id: 'salary', name: 'Salary' }, { id: 'freelance', name: 'Freelance' }, { id: 'other', name: 'Other' }]
    }
    return list
  }, [localCategories])

  if (!isOpen) return null

  const formatFileSize = (bytes) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const processFile = (selected) => {
    if (!selected) return
    setFile(selected)
    setError('')
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result
        setRawText(text)
        const rows = parseCsvText(text, null, localWallets, localCategories)

        // Strict validation: CSV must have all required columns matching the transaction table
        if (rows.headerValidation && !rows.headerValidation.isValid) {
          setError(
            rows.error ||
              `Invalid CSV header: Missing required column(s): ${rows.headerValidation.missingColumns.join(
                ', '
              )}. Your CSV must include Date, Type, Category, Wallet, and Amount columns to match the transaction table.`
          )
          setParsedRows([])
        } else if (rows.length === 0) {
          setError('No valid transaction records found in the CSV file.')
          setParsedRows([])
        } else {
          setError('')
          setParsedRows(rows)
        }
      } catch {
        setError('Error reading CSV file. Please make sure it is a valid UTF-8 text file.')
        setParsedRows([])
      }
    }
    reader.readAsText(selected)
  }

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0]
    processFile(selected)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!loading) setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (loading) return
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) {
      if (!dropped.name.endsWith('.csv') && dropped.type !== 'text/csv') {
        setError('Please drop a valid .csv file.')
        return
      }
      processFile(dropped)
    }
  }

  // Row filtering by validity
  const validRows = parsedRows.filter((r) => r.isValid)
  const invalidRows = parsedRows.filter((r) => !r.isValid)
  const missingWalletRows = parsedRows.filter((r) => r.isWalletMissing)
  const insufficientFundsRows = parsedRows.filter((r) => r.isInsufficientBalance)

  // Wallet creation trigger: creates with 0 initial balance for both income & expense
  const handleOpenCreateWalletModal = (row) => {
    setWalletPrompt({
      row,
      walletName: row.wallet_name || row.rawWallet || 'New Wallet',
      error: '',
    })
  }

  // Confirm creation of wallet with 0 initial amount
  const handleConfirmCreateWallet = async () => {
    if (!walletPrompt) return

    const cleanName = (walletPrompt.walletName || '').trim()

    if (!cleanName) {
      setWalletPrompt((prev) => ({ ...prev, error: 'Please enter a valid wallet name.' }))
      return
    }

    setWalletCreating(true)
    try {
      let created = null
      const walletPayload = {
        name: cleanName,
        wallet_type: 'BANK',
        initial_balance: 0,
        color: '#6366f1',
      }

      if (addWallet) {
        created = await addWallet(walletPayload)
      } else {
        created = await walletApi.createWallet(walletPayload)
      }

      // Refresh wallets in app and local state
      if (refreshWallets) {
        await refreshWallets()
      }
      const updatedWallets = await walletApi.getWallets().catch(() => [])
      if (updatedWallets.length > 0) {
        setLocalWallets(updatedWallets)
      }

      const walletIdToAssign = created?.id || updatedWallets.find((w) => w.name.toLowerCase() === cleanName.toLowerCase())?.id

      // Update all parsed rows referencing this wallet and recalculate running balances
      setParsedRows((prev) => {
        const mapped = prev.map((r) => {
          const rowWallet = (r.wallet_name || r.rawWallet || '').trim().toLowerCase()
          if (rowWallet === cleanName.toLowerCase() || (!r.wallet_id && r.isWalletMissing && rowWallet === cleanName.toLowerCase())) {
            return {
              ...r,
              wallet_id: walletIdToAssign,
              wallet_name: cleanName,
              isWalletMissing: false,
            }
          }
          return r
        })
        return recalculateRowsWithRunningBalance(mapped, updatedWallets)
      })

      if (showToast) {
        showToast(`Wallet "${cleanName}" created with 0 initial amount.`)
      }

      const triggeringRow = walletPrompt.row
      setWalletPrompt(null)

      // If the newly created wallet was for an expense, immediately chain Requirement 2: Add Income
      if (triggeringRow && (triggeringRow.type === 'expense' || triggeringRow.type === 'transfer')) {
        const targetRow = {
          ...triggeringRow,
          wallet_id: walletIdToAssign,
          wallet_name: cleanName,
          wallet_balance: 0,
        }
        handleOpenAddIncomeModal(targetRow)
      }
    } catch (err) {
      setWalletPrompt((prev) => ({
        ...prev,
        error: err.message || 'Failed to create wallet. Please try again.',
      }))
    } finally {
      setWalletCreating(false)
    }
  }

  // Open "Did you forget to add an income?" modal for a Low Funds expense row
  const handleOpenAddIncomeModal = (row) => {
    const w = localWallets.find((item) => String(item.id) === String(row.wallet_id))
    const currBal = Number(row.wallet_balance !== undefined ? row.wallet_balance : (w?.current_balance ?? w?.balance ?? w?.initial_balance ?? 0))
    const needed = Math.max(0, row.amount - currBal)
    const defaultCat = incomeCategoryOptions[0]?.name || 'Salary'

    setAddIncomePrompt({
      row,
      walletId: row.wallet_id,
      walletName: row.wallet_name,
      walletBalance: currBal,
      amountNeeded: needed,
      amount: needed > 0 ? needed : row.amount,
      category: defaultCat,
      note: `Deposit for ${row.note || row.category || 'expenses'}`,
      date: row.date || new Date().toISOString().split('T')[0],
      error: '',
    })
  }

  // Confirm creation of new income to cover expense
  const handleConfirmAddIncome = async () => {
    if (!addIncomePrompt) return

    const amt = Number(addIncomePrompt.amount)
    if (!amt || amt <= 0) {
      setAddIncomePrompt((prev) => ({ ...prev, error: 'Please enter a valid income amount.' }))
      return
    }

    if (amt < addIncomePrompt.amountNeeded) {
      setAddIncomePrompt((prev) => ({
        ...prev,
        error: `Income must be at least ${money(addIncomePrompt.amountNeeded, currency)} to cover this expense transaction.`,
      }))
      return
    }

    setIncomeCreating(true)
    try {
      await transactionApi.createTransaction({
        type: 'income',
        amount: amt,
        wallet_id: addIncomePrompt.walletId,
        category: addIncomePrompt.category || 'Salary',
        note: addIncomePrompt.note || 'Income deposit',
        date: addIncomePrompt.date || new Date().toISOString().split('T')[0],
        payment_method: 'Bank Transfer',
      })

      if (refreshWallets) {
        await refreshWallets()
      }

      const freshWallets = await walletApi.getWallets().catch(() => [])
      if (freshWallets.length > 0) {
        setLocalWallets(freshWallets)
      }

      // Recalculate parsed rows for all wallets sequentially with updated balance
      setParsedRows((prev) => recalculateRowsWithRunningBalance(prev, freshWallets))

      if (showToast) {
        showToast(`Income of ${money(amt, currency)} added to "${addIncomePrompt.walletName}"! Expense is now ready to import.`)
      }

      setAddIncomePrompt(null)
    } catch (err) {
      setAddIncomePrompt((prev) => ({
        ...prev,
        error: err.message || 'Failed to record income. Please try again.',
      }))
    } finally {
      setIncomeCreating(false)
    }
  }

  // Save and Import handler: imports valid rows, leaves un-added rows in the import modal
  const handleImport = async () => {
    if (validRows.length === 0) {
      setError('No valid transactions to import. Please resolve missing wallet requirements first.')
      return
    }

    setLoading(true)
    setError('')
    try {
      // 1. If any imported rows contain categories not in the DB, create them in the DB & Settings
      if (newCategoriesFromCsv.length > 0) {
        for (const nc of newCategoriesFromCsv) {
          try {
            await categoryApi.createCategory({
              name: nc.name,
              type: nc.type,
              color: '#2563eb',
              icon: 'tag',
            })
          } catch {
            // Already exists or handled
          }
        }
      }

      // 2. Import valid rows into transactions ledger
      await onImportConfirm(validRows)

      // 3. Refresh categories & wallets across application
      if (refreshCategories) await refreshCategories()
      if (refreshWallets) await refreshWallets()

      const remaining = parsedRows.filter((r) => !r.isValid)

      if (remaining.length > 0) {
        // Keep the un-added rows in the import modal
        setParsedRows(remaining)
        if (showToast) {
          showToast(
            `Imported ${validRows.length} valid transaction(s). ${remaining.length} transaction(s) remain in import awaiting wallet creation or income.`
          )
        }
      } else {
        // All rows were imported
        if (showToast) {
          showToast(`All ${validRows.length} transactions imported successfully.`)
        }
        setFile(null)
        setRawText('')
        setParsedRows([])
        onClose()
      }
    } catch (err) {
      setError(err.message || 'Failed to import transactions.')
    } finally {
      setLoading(false)
    }
  }

  const incomeCount = parsedRows.filter((r) => r.type === 'income').length
  const expenseCount = parsedRows.filter((r) => r.type === 'expense').length

  return (
    <>
      <div
        className="modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="csv-modal-title"
        onClick={(e) => {
          if (e.target === e.currentTarget && !loading && !walletCreating && !incomeCreating) onClose()
        }}
      >
        <div
          className="dialog-content"
          style={{
            maxWidth: '1100px',
            width: '97%',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            padding: '18px 22px 14px',
          }}
        >
          <div className="f" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            {/* Modal Header */}
            <div style={{ flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 id="csv-modal-title" style={{ margin: '0 0 2px', fontSize: '17px', fontWeight: 700 }}>
                  Import Transactions CSV
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading || walletCreating || incomeCreating}
                  aria-label="Close dialog"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--pl-text-muted)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <p style={{ margin: '0 0 8px', fontSize: '12px', color: 'var(--mute)' }}>
                Imported data matches your transaction table. Preview table is strictly read-only and validates wallet availability and funds.
              </p>
            </div>

            {/* Hidden file input */}
            <input
              id="csv-file-input"
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              disabled={loading}
              style={{ display: 'none' }}
            />

            {/* Upload Zone (when no file selected yet) */}
            {!file ? (
              <label
                htmlFor="csv-file-input"
                className={`csv-upload-zone ${isDragging ? 'dragging' : ''}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  padding: '32px 16px',
                  flexShrink: 0,
                  cursor: 'pointer',
                  border: '2px dashed var(--pl-border-default, #2a3449)',
                  borderRadius: '10px',
                  background: 'var(--pl-bg-surface-hover, rgba(255, 255, 255, 0.02))',
                  transition: 'all 0.2s ease',
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="csv-upload-icon-circle" style={{ margin: '0 auto 10px', alignSelf: 'center' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>

                <div className="csv-upload-prompt" style={{ textAlign: 'center', alignItems: 'center' }}>
                  <span className="csv-upload-prompt-text" style={{ fontSize: '14px', fontWeight: 600 }}>
                    Drag and drop your bank CSV statement here
                  </span>
                  <span className="csv-upload-hint" style={{ fontSize: '12px', color: 'var(--mute)', marginTop: '4px' }}>
                    CSV must include Date, Type, Category, Wallet, and Amount columns
                  </span>
                </div>

                <div className="csv-choose-btn" style={{ margin: '12px auto 0', alignSelf: 'center' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span>Choose File</span>
                </div>
              </label>
            ) : (
              /* File Details Bar */
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px',
                  padding: '7px 12px',
                  background: 'var(--pl-bg-surface-hover, #1b2334)',
                  border: '1px solid var(--pl-border-default, #1e293e)',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--pl-color-success, #10b981)', flexShrink: 0 }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span
                    style={{
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: 'var(--pl-text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '320px',
                    }}
                    title={file.name}
                  >
                    {file.name}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--mute)', whiteSpace: 'nowrap' }}>
                    ({formatFileSize(file.size)} &bull; {parsedRows.length} rows)
                  </span>
                  <label
                    htmlFor="csv-file-input"
                    style={{
                      fontSize: '11px',
                      color: 'var(--pl-color-primary, #818cf8)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      marginLeft: '6px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Change File
                  </label>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11.5px', color: 'var(--mute)' }}>
                  <span>
                    <strong style={{ color: 'var(--pl-color-success)' }}>{validRows.length}</strong> Ready to import
                  </span>
                  {invalidRows.length > 0 && (
                    <span>
                      <strong style={{ color: 'var(--pl-color-danger, #ef4444)' }}>{invalidRows.length}</strong> Pending requirement
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div
                className="err"
                role="alert"
                style={{
                  padding: '7px 12px',
                  borderRadius: '6px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: 'var(--pl-color-danger, #ef4444)',
                  fontSize: '11.5px',
                  marginBottom: '6px',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Prominent Alert: Missing Wallets in Imported CSV */}
            {missingWalletRows.length > 0 && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: '7px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1.5px solid rgba(239, 68, 68, 0.35)',
                  marginBottom: '6px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  flexShrink: 0,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--pl-color-danger, #ef4444)', marginTop: '2px', flexShrink: 0 }}>
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--pl-color-danger, #ef4444)' }}>
                    Alert: {missingWalletRows.length} transaction(s) reference a wallet that does not exist in the app.
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--pl-text-secondary, #94a3b8)', marginTop: '2px', lineHeight: 1.4 }}>
                    These rows will not be imported until the wallet is created. You can click <b>Create Wallet</b> on the row to create the wallet with 0 initial amount.
                  </div>
                </div>
              </div>
            )}

            {/* Low Funds / Did you forget to add an income banner */}
            {insufficientFundsRows.length > 0 && (
              <div
                style={{
                  padding: '7px 12px',
                  borderRadius: '6px',
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  color: 'var(--pl-color-warning, #f59e0b)',
                  fontSize: '11.5px',
                  marginBottom: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexShrink: 0,
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div style={{ flex: 1 }}>
                  <b>Low Funds: Did you forget to add an income?</b> {insufficientFundsRows.length} expense transaction(s) exceed current wallet balance. Click <u>Did you forget to add an income?</u> on the row to record an income with enough amount to add these transactions.
                </div>
              </div>
            )}

            {/* New Categories Notice */}
            {newCategoriesFromCsv.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 10px',
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  borderRadius: '6px',
                  marginBottom: '6px',
                  fontSize: '11px',
                  color: 'var(--pl-text-primary)',
                  flexShrink: 0,
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--pl-color-primary)', flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span>
                  <b>{newCategoriesFromCsv.length} new category/categories detected:</b> {newCategoriesFromCsv.map((u) => `"${u.name}"`).join(', ')}. Saved automatically on Save & Import.
                </span>
              </div>
            )}

            {/* Read-Only Preview Table */}
            {parsedRows.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                {/* Row Summary */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '6px',
                    fontSize: '11.5px',
                    flexShrink: 0,
                  }}
                >
                  <span>
                    <b>{parsedRows.length} transactions</b>{' '}
                    <span style={{ fontSize: '10.5px', color: 'var(--mute)' }}>
                      (Unchangeable read-only preview matching transaction table)
                    </span>
                  </span>
                  <span style={{ color: 'var(--mute)' }}>
                    {incomeCount} income &bull; {expenseCount} expense
                  </span>
                </div>

                {/* Table Container - Vertical scroll only, strictly unchangeable rows */}
                <div
                  className="csv-table-scroll-container"
                  style={{
                    height: '280px',
                    maxHeight: '340px',
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    overscrollBehavior: 'contain',
                    border: '1.5px solid var(--pl-border-default)',
                    borderRadius: 'var(--pl-radius-md, 8px)',
                    marginBottom: '8px',
                    position: 'relative',
                    background: 'var(--pl-bg-surface)',
                    flexShrink: 0,
                  }}
                >
                  <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left' }}>
                    <colgroup>
                      <col style={{ width: '4%' }} />
                      <col style={{ width: '11%' }} />
                      <col style={{ width: '8%' }} />
                      <col style={{ width: '13%' }} />
                      <col style={{ width: '15%' }} />
                      <col style={{ width: '17%' }} />
                      <col style={{ width: '11%' }} />
                      <col style={{ width: '21%' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th style={{ ...fixedHeaderStyle, textAlign: 'center', padding: '8px 2px' }}>#</th>
                        <th style={fixedHeaderStyle}>Date</th>
                        <th style={fixedHeaderStyle}>Type</th>
                        <th style={fixedHeaderStyle}>Category</th>
                        <th style={fixedHeaderStyle}>Wallet</th>
                        <th style={fixedHeaderStyle}>Description</th>
                        <th style={{ ...fixedHeaderStyle, textAlign: 'right' }}>Amount</th>
                        <th style={{ ...fixedHeaderStyle, textAlign: 'center' }}>Requirement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.map((row, idx) => {
                        const isRowValid = row.isValid
                        const isRowCatInDb = localCategories.some(
                          (c) => c.name.toLowerCase() === (row.category || '').toLowerCase()
                        )

                        return (
                          <tr
                            key={row.id || idx}
                            style={{
                              minHeight: '40px',
                              background: isRowValid ? 'transparent' : 'rgba(239, 68, 68, 0.04)',
                              borderBottom: '1px solid var(--pl-border-default)',
                            }}
                          >
                            {/* Row Index */}
                            <td style={{ ...tdStyle, color: 'var(--mute)', fontSize: '11px', textAlign: 'center', padding: '4px 2px' }}>
                              {idx + 1}
                            </td>

                            {/* Date (Read-Only) */}
                            <td style={tdStyle}>
                              <span
                                style={{
                                  fontSize: '11.5px',
                                  fontWeight: 600,
                                  color: row.date ? 'var(--pl-text-primary)' : 'var(--pl-color-danger, #ef4444)',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {row.date || 'Missing Date'}
                              </span>
                            </td>

                            {/* Type (Read-Only Badge) */}
                            <td style={tdStyle}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '2px 6px',
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  borderRadius: '4px',
                                  textTransform: 'uppercase',
                                  background: row.type === 'income' ? 'var(--pl-color-success-soft)' : 'var(--pl-color-danger-soft, rgba(239, 68, 68, 0.12))',
                                  color: row.type === 'income' ? 'var(--pl-color-success)' : 'var(--pl-color-danger, #ef4444)',
                                  border: `1px solid ${row.type === 'income' ? 'var(--pl-color-success-soft)' : 'rgba(239, 68, 68, 0.2)'}`,
                                }}
                              >
                                {row.type}
                              </span>
                            </td>

                            {/* Category (Read-Only Badge) */}
                            <td style={{ ...tdStyle, overflow: 'hidden' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%', minWidth: 0 }}>
                                <span
                                  style={{
                                    fontSize: '11.5px',
                                    fontWeight: 600,
                                    color: 'var(--pl-text-primary)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    flex: 1,
                                    minWidth: 0,
                                  }}
                                  title={row.category || 'Missing'}
                                >
                                  {row.category || <span style={{ color: 'var(--pl-color-danger, #ef4444)' }}>Missing</span>}
                                </span>
                                {!isRowCatInDb && row.category && (
                                  <span
                                    style={{
                                      fontSize: '9px',
                                      fontWeight: 700,
                                      padding: '1px 4px',
                                      borderRadius: '4px',
                                      background: 'var(--pl-color-primary-soft, rgba(37, 99, 235, 0.14))',
                                      color: 'var(--pl-color-primary, #2563eb)',
                                      textTransform: 'uppercase',
                                      whiteSpace: 'nowrap',
                                      flexShrink: 0,
                                    }}
                                    title="New category from CSV. Saved automatically on Save & Import."
                                  >
                                    New
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Wallet (Read-Only: Shows status or Not Found) */}
                            <td style={{ ...tdStyle, overflow: 'hidden' }}>
                              {row.isWalletMissing ? (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    color: 'var(--pl-color-danger, #ef4444)',
                                    background: 'rgba(239, 68, 68, 0.08)',
                                    padding: '2px 5px',
                                    borderRadius: '4px',
                                    border: '1px solid rgba(239, 68, 68, 0.25)',
                                    maxWidth: '100%',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                  title={`Wallet "${row.wallet_name || row.rawWallet || 'Unknown'}" does not exist in app`}
                                >
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                  </svg>
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {row.wallet_name || row.rawWallet || 'Not Found'}
                                  </span>
                                </span>
                              ) : (
                                <span
                                  style={{
                                    fontSize: '11.5px',
                                    fontWeight: 600,
                                    color: 'var(--pl-text-primary)',
                                    display: 'inline-block',
                                    maxWidth: '100%',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                  title={row.wallet_name}
                                >
                                  {row.wallet_name}
                                </span>
                              )}
                            </td>

                            {/* Note / Description (Read-Only) */}
                            <td style={{ ...tdStyle, overflow: 'hidden' }}>
                              <span
                                style={{
                                  fontSize: '11.5px',
                                  color: row.note ? 'var(--pl-text-secondary)' : 'var(--mute)',
                                  display: 'block',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                                title={row.note || ''}
                              >
                                {row.note || '-'}
                              </span>
                            </td>

                            {/* Amount (Read-Only Formatted Currency) */}
                            <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <span
                                style={{
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  fontFamily: "'JetBrains Mono', monospace",
                                  color: row.type === 'income' ? 'var(--pl-color-success)' : 'var(--pl-color-danger, #ef4444)',
                                }}
                              >
                                {row.type === 'income' ? '+' : '-'}
                                {money(row.amount || 0, currency)}
                              </span>
                            </td>

                            {/* Requirement Column: Status & Resolution Actions */}
                            <td style={{ ...tdStyle, textAlign: 'center', padding: '4px 2px' }}>
                              {isRowValid ? (
                                <span
                                  style={{
                                    fontSize: '10.5px',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: 'var(--pl-radius-pill, 9999px)',
                                    background: 'var(--pl-color-success-soft)',
                                    color: 'var(--pl-color-success)',
                                  }}
                                >
                                  Ready
                                </span>
                              ) : row.isWalletMissing ? (
                                /* When wallet is missing: user can create new wallet with 0 initial amount */
                                <button
                                  type="button"
                                  onClick={() => handleOpenCreateWalletModal(row)}
                                  title="Wallet does not exist. Click to create this wallet with 0 initial amount."
                                  style={{
                                    fontSize: '10.5px',
                                    fontWeight: 700,
                                    padding: '3px 8px',
                                    borderRadius: '5px',
                                    background: 'var(--pl-color-primary, #6366f1)',
                                    color: '#ffffff',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
                                    <line x1="12" y1="5" x2="12" y2="19" />
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                  </svg>
                                  Create Wallet
                                </button>
                              ) : row.isInsufficientBalance ? (
                                /* After wallet created with 0 or low balance: shows Low Funds & "Did you forget to add an income?" */
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                                  <span
                                    style={{
                                      fontSize: '9.5px',
                                      fontWeight: 700,
                                      padding: '1px 6px',
                                      borderRadius: 'var(--pl-radius-pill, 9999px)',
                                      background: 'rgba(245, 158, 11, 0.15)',
                                      color: 'var(--pl-color-warning, #f59e0b)',
                                      border: '1px solid rgba(245, 158, 11, 0.3)',
                                      whiteSpace: 'nowrap',
                                    }}
                                    title={`Wallet balance: ${money(row.wallet_balance || 0, currency)}, Required: ${money(row.amount, currency)}`}
                                  >
                                    Low Funds
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAddIncomeModal(row)}
                                    title="Did you forget to add an income? Click to add an income with enough amount to record this transaction."
                                    style={{
                                      fontSize: '9.5px',
                                      fontWeight: 600,
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      background: 'rgba(16, 185, 129, 0.12)',
                                      color: 'var(--pl-color-success, #10b981)',
                                      border: '1px solid rgba(16, 185, 129, 0.35)',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    Did you forget to add an income?
                                  </button>
                                </div>
                              ) : (
                                <span
                                  title={`Missing: ${row.missingFields?.join(', ')}`}
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    padding: '2px 6px',
                                    borderRadius: 'var(--pl-radius-pill, 9999px)',
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    color: 'var(--pl-color-danger, #ef4444)',
                                    cursor: 'help',
                                  }}
                                >
                                  Incomplete
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modal Bottom Actions */}
            <div className="btns" style={{ marginTop: '4px', paddingTop: '6px', flexShrink: 0 }}>
              <button
                type="button"
                className="ghost"
                onClick={onClose}
                disabled={loading || walletCreating || incomeCreating}
              >
                Cancel
              </button>

              <button
                type="button"
                className="primary"
                onClick={handleImport}
                disabled={loading || parsedRows.length === 0 || validRows.length === 0}
                style={{
                  opacity: loading || parsedRows.length === 0 || validRows.length === 0 ? 0.6 : 1,
                  cursor: loading || parsedRows.length === 0 || validRows.length === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                {loading
                  ? 'Saving & Importing...'
                  : validRows.length === parsedRows.length && parsedRows.length > 0
                  ? `Save & Import All (${validRows.length})`
                  : validRows.length > 0
                  ? `Save & Import Valid (${validRows.length} of ${parsedRows.length})`
                  : `Resolve Wallet Requirements (${invalidRows.length} pending)`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Sub-Modal: Create Wallet with 0 initial amount */}
      {walletPrompt && (
        <div
          className="modal-overlay"
          style={{ zIndex: 1100 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-wallet-prompt-title"
        >
          <div
            className="dialog-content"
            style={{
              maxWidth: '460px',
              width: '90%',
              padding: '20px 24px',
            }}
          >
            <h3 id="create-wallet-prompt-title" style={{ margin: '0 0 10px', fontSize: '16px', fontWeight: 700 }}>
              Create Wallet &ldquo;{walletPrompt.walletName}&rdquo;
            </h3>

            <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--pl-text-secondary)', lineHeight: 1.5 }}>
              The imported transaction references wallet <strong style={{ color: 'var(--pl-text-primary)' }}>&ldquo;{walletPrompt.walletName}&rdquo;</strong>, which does not exist in your app.
            </p>

            <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--pl-text-secondary)', lineHeight: 1.5 }}>
              Can I create wallet <strong style={{ color: 'var(--pl-text-primary)' }}>&ldquo;{walletPrompt.walletName}&rdquo;</strong> with <b>0 initial amount</b>?
            </p>

            {walletPrompt.error && (
              <div
                style={{
                  padding: '7px 10px',
                  borderRadius: '6px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: 'var(--pl-color-danger, #ef4444)',
                  fontSize: '12px',
                  marginBottom: '12px',
                }}
              >
                {walletPrompt.error}
              </div>
            )}

            <div className="btns" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button
                type="button"
                className="ghost"
                onClick={() => setWalletPrompt(null)}
                disabled={walletCreating}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary"
                onClick={handleConfirmCreateWallet}
                disabled={walletCreating}
              >
                {walletCreating ? 'Creating Wallet...' : 'Yes, Create Wallet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Sub-Modal: "Did you forget to add an income?" */}
      {addIncomePrompt && (
        <div
          className="modal-overlay"
          style={{ zIndex: 1100 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-income-prompt-title"
        >
          <div
            className="dialog-content"
            style={{
              maxWidth: '480px',
              width: '90%',
              padding: '20px 24px',
            }}
          >
            <h3 id="add-income-prompt-title" style={{ margin: '0 0 10px', fontSize: '16px', fontWeight: 700 }}>
              Add Income to &ldquo;{addIncomePrompt.walletName}&rdquo;
            </h3>

            <p style={{ margin: '0 0 10px', fontSize: '13px', color: 'var(--pl-text-secondary)', lineHeight: 1.5 }}>
              <b>Did you forget to add an income?</b>
            </p>

            <p style={{ margin: '0 0 14px', fontSize: '12.5px', color: 'var(--pl-text-secondary)', lineHeight: 1.5 }}>
              The expense <strong style={{ color: 'var(--pl-text-primary)' }}>&ldquo;{addIncomePrompt.row.note || addIncomePrompt.row.category}&rdquo;</strong> requires <strong style={{ color: 'var(--pl-color-danger, #ef4444)' }}>{money(addIncomePrompt.row.amount, currency)}</strong>, but <strong style={{ color: 'var(--pl-text-primary)' }}>&ldquo;{addIncomePrompt.walletName}&rdquo;</strong> currently has only <strong style={{ color: 'var(--pl-color-warning, #f59e0b)' }}>{money(addIncomePrompt.walletBalance, currency)}</strong>.
            </p>

            <p style={{ margin: '0 0 14px', fontSize: '12px', color: 'var(--pl-text-muted)', lineHeight: 1.4 }}>
              Record an income of at least <strong style={{ color: 'var(--pl-color-success, #10b981)' }}>{money(addIncomePrompt.amountNeeded, currency)}</strong> to cover this expense and add the transaction to your ledger:
            </p>

            {addIncomePrompt.error && (
              <div
                style={{
                  padding: '7px 10px',
                  borderRadius: '6px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: 'var(--pl-color-danger, #ef4444)',
                  fontSize: '12px',
                  marginBottom: '12px',
                }}
              >
                {addIncomePrompt.error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              <div>
                <label
                  htmlFor="prompt-income-amount"
                  style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--pl-text-primary)' }}
                >
                  Income Amount (Min {money(addIncomePrompt.amountNeeded, currency)}):
                </label>
                <input
                  id="prompt-income-amount"
                  type="number"
                  step="any"
                  min={addIncomePrompt.amountNeeded}
                  value={addIncomePrompt.amount}
                  onChange={(e) => setAddIncomePrompt((prev) => ({ ...prev, amount: e.target.value }))}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: Number(addIncomePrompt.amount) >= Number(addIncomePrompt.amountNeeded) ? '1px solid var(--pl-border-default)' : '1.5px solid var(--pl-color-danger, #ef4444)',
                    background: 'var(--pl-bg-surface)',
                    color: 'var(--pl-color-success, #10b981)',
                    fontSize: '14px',
                    fontWeight: 700,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="prompt-income-category"
                  style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--pl-text-primary)' }}
                >
                  Income Category:
                </label>
                <CustomDropdown
                  id="prompt-income-category"
                  value={addIncomePrompt.category}
                  onChange={(val) => setAddIncomePrompt((prev) => ({ ...prev, category: val }))}
                  options={incomeCategoryOptions.map((cat) => ({
                    value: cat.name,
                    label: cat.name,
                  }))}
                  placeholder="-- Select Category --"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label
                  htmlFor="prompt-income-note"
                  style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--pl-text-primary)' }}
                >
                  Description / Note:
                </label>
                <input
                  id="prompt-income-note"
                  type="text"
                  value={addIncomePrompt.note}
                  onChange={(e) => setAddIncomePrompt((prev) => ({ ...prev, note: e.target.value }))}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--pl-border-default)',
                    background: 'var(--pl-bg-surface)',
                    color: 'var(--pl-text-primary)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="prompt-income-date"
                  style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--pl-text-primary)' }}
                >
                  Date:
                </label>
                <CustomDatePicker
                  id="prompt-income-date"
                  value={addIncomePrompt.date}
                  onChange={(newDate) => setAddIncomePrompt((prev) => ({ ...prev, date: newDate }))}
                  placeholder="Select Date"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div className="btns" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="ghost"
                onClick={() => setAddIncomePrompt(null)}
                disabled={incomeCreating}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary"
                onClick={handleConfirmAddIncome}
                disabled={incomeCreating || Number(addIncomePrompt.amount) < Number(addIncomePrompt.amountNeeded)}
                style={{
                  opacity: Number(addIncomePrompt.amount) < Number(addIncomePrompt.amountNeeded) ? 0.6 : 1,
                  cursor: Number(addIncomePrompt.amount) < Number(addIncomePrompt.amountNeeded) ? 'not-allowed' : 'pointer',
                }}
              >
                {incomeCreating ? 'Recording Income...' : 'Record Income & Update Wallet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Sticky header style
const fixedHeaderStyle = {
  position: 'sticky',
  top: 0,
  zIndex: 10,
  background: 'var(--pl-bg-surface, #131926)',
  color: 'var(--pl-text-muted, #94a3b8)',
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  padding: '8px 6px',
  borderBottom: '1.5px solid var(--pl-border-default, #1e293e)',
  boxShadow: '0 1px 0 var(--pl-border-default, #1e293e)',
  whiteSpace: 'nowrap',
  userSelect: 'none',
  boxSizing: 'border-box',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

// Table cell style
const tdStyle = {
  padding: '6px 6px',
  verticalAlign: 'middle',
  borderBottom: '1px solid var(--pl-border-default, #1e293e)',
  boxSizing: 'border-box',
  overflow: 'hidden',
}

export default CsvImportModal
