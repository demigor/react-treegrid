import React, { useRef, memo, useCallback, useState, useEffect, useLayoutEffect, useMemo } from 'react'
import cn from 'classnames'
import Grid from 'react-virtualized/dist/commonjs/Grid'
import Draggable from 'react-draggable'
import { Flex } from '../flex'
import { useSize } from './Hooks'
import 'react-virtualized/styles.css'
import './Table.css'


function getStar(star) {
  if (star === undefined) return 0
  if (star === true) return 1
  if (star === false || isNaN(star)) return 0
  return star
}

function limitWidth(column, width) {
  let { minWidth = 50, maxWidth } = column

  if (width < minWidth)
    return minWidth

  if (maxWidth !== undefined && width > maxWidth)
    return maxWidth

  return width
}

function getCellStyle(args, rowStyle) {
  return typeof rowStyle === "function" ? rowStyle(args) : rowStyle
}

function getCellData(args) {
  let { column } = args
  let { cellDataGetter, cellFormatter, cellRenderer } = column

  args.cellData = cellDataGetter ? cellDataGetter(args) : args.rowData[column.dataKey]

  if (cellFormatter) args.cellData = cellFormatter(args)

  return cellRenderer ? cellRenderer(args) : args.cellData
}

function calcState(children, oldState) {

  let columns = React.Children.toArray(children).map(i => i.props)
  let stars = columns.map(i => getStar(i.star))
  let starCount = stars.reduce((r, e) => r + e)
  let widths = columns.map(i => i.width || 100)

  return { ...oldState, columns, starCount, stars, widths }
}

const sectionSetup = {
  columnStartIndex: 0,
  columnStopIndex: 0,
  rowStartIndex: 0,
  rowStopIndex: 0,
  pageSizeX: 0,
  pageSizeY: 0
}

const stateSetup = {
  scrollLeft: 0,
  vertScrollBar: 0,
  columns: [],
  starCount: 0,
  stars: [],
  widths: []
}

export const Table = memo(props => {
  let frameRef = useRef()
  let { width = 0, height = 0 } = useSize(frameRef)

  let section = useRef(sectionSetup)

  let headerRef = useRef()
  let clientRef = useRef()

  let { rowHeight, rows, className, getRowStyle, getRowClassName, children, scrollToColumn: stc, scrollToRow: str, sortBy, emptyText, disableHeader, onSort, onSelect, ...rest } = props
  let rowCount = rows && rows.length

  let sorting = useMemo(() => sortBy && Array.isArray(sortBy) ? sortBy : (sortBy || "").split(','), [sortBy])

  let [state, setState] = useState(() => calcState(children, stateSetup))
  let { columns, stars, starCount, widths, scrollLeft, vertScrollBar, scrollToRow, scrollToColumn } = state
  let columnCount = columns && columns.length
  let getColumnWidth = useCallback(({ index }) => widths[index], [widths])

  useEffect(() => void (setState(s => calcState(children, s))), [children])
  useEffect(() => { if (stc !== undefined) setState(s => ({ ...s, scrollToColumn: stc })) }, [stc])
  useEffect(() => { if (str !== undefined) setState(s => ({ ...s, scrollToRow: str })) }, [str])
  useLayoutEffect(() => void (recalcStarColumns()), [width])

  function recalcStarColumns(newState = {}, columnIndex = 0) {
    if (starCount) {
      let { widths: _widths = widths, width: _width = width, vertScrollBar: _vertScrollBar = vertScrollBar } = newState
      let newWidths = [..._widths]

      let usedPixels = 0

      for (let i = 0; i < stars.length; i++) {
        const star = stars[i]
        if (star === 0) {
          usedPixels += _widths[i]
        }
      }

      let free = _width - usedPixels - _vertScrollBar

      for (let i = 0; i < stars.length; i++) {
        let star = stars[i]
        if (star > 0) {
          if (free < 0) free = 0
          let quota = free / starCount
          let newWidth = limitWidth(columns[i], star === starCount ? free : star * quota)
          newWidths[i] = newWidth
          starCount -= star
          free -= newWidth
        }
      }

      setStateAndRecalc({ ...newState, widths: newWidths }, { columnIndex })
      return
    }

    setStateAndRecalc(newState, { columnIndex })
  }

  function setStateAndRecalc(state, compute) {
    setState(s => ({ ...s, ...state }))
    headerRef.current && headerRef.current.recomputeGridSize(compute)
    clientRef.current && clientRef.current.recomputeGridSize(compute)
  }

  function scrollBarPresenceChanged({ vertical, size }) {
    recalcStarColumns({ vertScrollBar: vertical ? size : 0 })
  }

  function selectCell(scrollToColumn, scrollToRow) {
    setState(s => ({ ...s, scrollToColumn, scrollToRow }))
    if (onSelect) onSelect({ row: scrollToRow, column: scrollToColumn })
  }

  function resizeColumn(index, delta) {
    let _width = widths[index]
    let width = limitWidth(columns[index], _width + delta)

    if (width !== _width) {
      var _widths = [...widths]
      _widths[index] = width
      recalcStarColumns({ widths: _widths }, index)
    }
  }

  let sectionRendered = useCallback(({ columnStartIndex, columnStopIndex, rowStartIndex, rowStopIndex }) => {
    section.current = {
      columnStartIndex,
      columnStopIndex,
      rowStartIndex,
      rowStopIndex,
      pageSizeY: rowStopIndex - rowStartIndex,
      pageSizeX: columnStopIndex - columnStartIndex
    }
  }, [section])

  let scroll = useCallback(({ scrollLeft }) => setState(s => ({ ...s, scrollLeft })), [])

  let renderHeaderCell = useCallback(({ columnIndex, key, style }) => {
    let column = columns[columnIndex]
    let sortAsc = false
    let sortDesc = false

    if (sorting.includes(column.dataKey)) {
      sortAsc = true
    } else if (sorting.includes("-" + column.dataKey)) {
      sortDesc = true
    }

    let click
    if (onSort && !column.disableSort) {
      if (sortDesc)
        click = e => onSort(column.dataKey, args, e)
      else
        click = e => onSort("-" + column.dataKey, args, e)
    }

    let args = { rowIndex: -1, columnIndex, column, dataKey: column.dataKey, sortAsc, sortDesc }
    let columnSelected = scrollToColumn === columnIndex

    let cc = cn(getCellStyle(args, getRowClassName), getCellStyle(args, column.className), "headerCell", { "selected-column": columnSelected, "sort-asc": sortAsc, "sort-desc": sortDesc, "sortable": !!click })
    let cs = { ...getCellStyle(args, getRowStyle), ...getCellStyle(args, column.style) }

    let hasSplitter = !column.disableResize && stars[columnIndex] === 0
    let splitter = hasSplitter && <Draggable axis="x" position={{ x: 0 }} zIndex={999} onStop={() => recalcStarColumns()} onDrag={(e, { deltaX }) => resizeColumn(columnIndex, deltaX)}><div className="splitter" /></Draggable>

    return (<div key={key} className={cc} style={style} onClick={click}>
      <div className="content" style={cs}>{column.label}</div>
      {splitter}
    </div>)
  }, [columns, scrollToColumn, getRowClassName, getRowStyle, widths, sorting])

  let renderCell = useCallback(({ columnIndex, key, rowIndex, style }) => {
    let rowData = rows[rowIndex]
    let column = columns[columnIndex]
    let args = { rowIndex, columnIndex, rowData, column, dataKey: column.dataKey }
    let cell = getCellData(args)
    let rowSelected = scrollToRow === rowIndex
    let columnSelected = scrollToColumn === columnIndex
    let cc = cn(getCellStyle(args, getRowClassName), getCellStyle(args, column.className), "cell", { "selected-row": rowSelected, "selected-column": columnSelected, "selected": rowSelected && columnSelected })
    let cs = { ...getCellStyle(args, getRowStyle), ...getCellStyle(args, column.style), ...style }

    return (<div key={key} className={cc} style={cs} onClick={() => selectCell(columnIndex, rowIndex)}>{cell}</div>)
  }, [columns, rows, scrollToRow, scrollToColumn, getRowClassName, getRowStyle, widths])

  let renderNoCells = useCallback(() => (<div className="noCells">{emptyText}</div>), [emptyText])

  let keyDown = useCallback(event => {
    if (event.altKey || event.ctrlKey || event.shiftKey) return

    let col = scrollToColumn
    let row = scrollToRow
    let pageSizeY = section.current.pageSizeY

    switch (event.key) {
      case "Home":
        row = 0
        break

      case "End":
        row = rowCount - 1
        break

      case 'ArrowDown':
        row = Math.min(scrollToRow + 1, rowCount - 1)
        break

      case 'ArrowLeft':
        col = Math.max(scrollToColumn - 1, 0)
        break

      case 'ArrowRight':
        col = Math.min(scrollToColumn + 1, columnCount - 1)
        break

      case 'ArrowUp':
        row = Math.max(scrollToRow - 1, 0)
        break

      case "PageUp":
        row = Math.max(scrollToRow - pageSizeY, 0)
        break

      case "PageDown":
        row = Math.min(scrollToRow + pageSizeY, rowCount - 1)
        break

      default:
        break
    }

    if (col !== scrollToColumn || row !== scrollToRow) {
      event.preventDefault()
      selectCell(col, row)
    }
  }, [columnCount, rowCount, scrollToColumn, scrollToRow])

  let gridHeight = disableHeader ? height : height - rowHeight

  return (
    <Flex {...rest} box ref={frameRef} className={className} onKeyDown={keyDown}>

      {!disableHeader && <Grid
        className="headerGrid"
        width={width - vertScrollBar}
        height={rowHeight}
        cellRenderer={renderHeaderCell}
        columnWidth={getColumnWidth}
        columnCount={columnCount}
        overscanColumns={10}
        overscanRows={10}
        scrollToColumn={scrollToColumn}
        rowHeight={rowHeight}
        rowCount={1}
        scrollLeft={scrollLeft}
        ref={headerRef} />}

      <Grid
        className="grid"
        width={width}
        height={gridHeight}
        cellRenderer={renderCell}
        noContentRenderer={renderNoCells}
        columnWidth={getColumnWidth}
        columnCount={columnCount}
        overscanColumns={10}
        overscanRows={10}
        scrollToRow={scrollToRow}
        scrollToColumn={scrollToColumn}
        rowHeight={rowHeight}
        rowCount={rowCount}
        onScroll={scroll}
        onSectionRendered={sectionRendered}
        onScrollbarPresenceChange={scrollBarPresenceChanged}
        ref={clientRef} />

    </Flex>)
})

Table.defaultProps = {
  rowHeight: 30,
  rows: [],
  getRowClassName: ({ rowIndex }) => rowIndex % 2 === 0 ? "evenRow" : "oddRow",
  getRowStyle: undefined,
  emptyText: "No Items"
}