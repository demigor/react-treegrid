import React from 'react'
import cn from 'classnames'
import { ResizeSensor } from '@blueprintjs/core'
import { FixedSizeList as Grid } from 'react-window'
import Draggable from 'react-draggable'
import scrollbarSize from 'dom-helpers/util/scrollbarSize'
import './Example-window.css'

export class Column extends React.PureComponent {
  static defaultProps = {
    dataKey: undefined,
    label: undefined,
    star: false,
    width: 100,
    minWidth: 0,
    maxWidth: undefined,
    style: undefined,
    cellDataGetter: undefined,
    cellFormatter: undefined,
    cellRenderer: undefined,
    columnData: undefined,
    disableSort: false,
    disableResize: false,
    testid: undefined
  }

  render = () => null
}

function getStar(star) {
  if (star === undefined) return 0
  if (star === true) return 1
  if (star === false || isNaN(star)) return 0
  return star
}

class TreeGrid extends React.PureComponent {

  static defaultProps = {
    rowHeight: 30,
    rows: [],
    getRowClassName: ({ rowIndex }) => rowIndex % 2 === 0 ? "evenRow" : "oddRow",
    getRowStyle: undefined,
    emptyText: "List is empty"
  }

  state = {
    width: 0,
    height: 0,
    vertScrollBar: 0
  }

  onResize = (e) => {
    const rect = e[0].contentRect
    this.recalcStarColumns({ width: rect.width, height: rect.height })
  }

  recalcStarColumns = (newState = {}, columnIndex = 0) => {
    let { starCount } = this.state

    if (starCount) {

      const { columns, stars, widths: _widths, width: _width, vertScrollBar: _vertScrollBar } = this.state
      const { widths = _widths, width = _width, vertScrollBar = _vertScrollBar } = newState
      const newWidths = [...widths]

      let usedPixels = 0

      for (let i = 0; i < stars.length; i++) {
        const star = stars[i]
        if (star === 0) {
          usedPixels += widths[i]
        }
      }

      let free = width - usedPixels - vertScrollBar

      for (let i = 0; i < stars.length; i++) {
        const star = stars[i]
        if (star > 0) {
          if (free < 0) free = 0
          const quota = free / starCount
          const newWidth = this.limitWidth(columns[i], star === starCount ? free : star * quota)
          newWidths[i] = newWidth
          starCount -= star
          free -= newWidth
        }
      }

      this.setStateAndRecalc({ ...newState, widths: newWidths }, columnIndex)
      return
    }

    this.setStateAndRecalc(newState, columnIndex)
  }

  static getDerivedStateFromProps(props, state) {

    if (props.children !== state.children) {
      const columns = React.Children.toArray(props.children).map(i => i.props)
      const stars = columns.map(i => getStar(i.star))
      const starCount = stars.reduce((r, e) => r + e)
      const widths = columns.map(i => i.width || 100)

      return { children: props.children, columns, starCount, stars, widths }
    }

    if ((props.scrollToColumn !== undefined && props.scrollToColumn !== state.stc) || (props.scrollToRow !== undefined && props.scrollToRow !== state.str)) {
      return { scrollToColumn: props.scrollToColumn, scrollToRow: props.scrollToRow }
    }

    return null
  }

  onResizeColumn = (index, delta) => {
    const { columns, widths: _widths } = this.state
    const _width = _widths[index]
    const width = this.limitWidth(columns[index], _width + delta)

    if (width !== _width) {
      var widths = [..._widths]
      widths[index] = width
      this.recalcStarColumns({ widths }, index)
    }
  }

  setStateAndRecalc(state, columnIndex) {
    this.setState(state)
    {
      const e = this.headerRef.current
      if (e) e.resetAfterColumnIndex(columnIndex)
    }
    {
      const e = this.clientRef.current
      if (e) e.resetAfterColumnIndex(columnIndex)
    }
  }

  limitWidth(column, width) {
    const { minWidth = 50, maxWidth } = column
    if (width < minWidth)
      return minWidth

    if (maxWidth !== undefined && width > maxWidth)
      return maxWidth

    return width
  }

  onColumnResized = () => this.recalcStarColumns()

  renderHeaderCell = ({ columnIndex, key, style }) => {
    const { columns, stars } = this.state
    const column = columns[columnIndex]
    const hasSplitter = !column.disableResize && stars[columnIndex] === 0

    return (<div key={key} style={style} className="headerCell">
      <div className="content">{column.label}</div>
      {hasSplitter && <Draggable axis="x" position={{ x: 0 }} zIndex={999} onStop={this.onColumnResized} onDrag={(e, { deltaX }) => this.onResizeColumn(columnIndex, deltaX)}><div className="splitter" /></Draggable>}
    </div>)
  }

  renderCell = ({ columnIndex, rowIndex, style }) => {
    const { rows } = this.props
    const rowData = rows[rowIndex]

    const { scrollToRow, columns } = this.state
    const column = columns[columnIndex]

    const args = { rowIndex, columnIndex, rowData, column, dataKey: column.dataKey }
    const cell = this.getCellData(args)
    const cc = cn(this.getCellClassName(args), "cell", { "selected": scrollToRow === rowIndex })
    const cs = { ...this.getCellStyle(args), ...style }

    return (<div className={cc} style={cs} onClick={() => this.onSelectCell({ columnIndex, rowIndex })}>{cell}</div>)
  }

  getCellClassName(args) {
    const { getRowClassName } = this.props
    return getRowClassName && getRowClassName(args)
  }

  getCellStyle(args) {
    const { getRowStyle } = this.props
    return getRowStyle && getRowStyle(args)
  }

  getCellData(args) {
    const { column, rowData } = args
    const { cellDataGetter, cellFormatter, cellRenderer } = column

    args.cellData = rowData[column.dataKey]
    if (cellDataGetter) args.cellData = cellDataGetter(args)
    if (cellFormatter) args.cellData = cellFormatter(args)
    if (cellRenderer) return cellRenderer(args)

    return args.cellData
  }

  renderNoCells = (e) =>
    (<div className="noCells">{this.props.emptyText}</div>)

  scrollBarPresenceChanged = ({ vertical }) => {
    this.recalcStarColumns({ vertScrollBar: (vertical ? scrollbarSize() : 0) })
  }

  headerRef = React.createRef()
  clientRef = React.createRef()

  onScroll = ({ scrollLeft }) =>
    this.setState({ scrollLeft })

  onSelectCell = ({ columnIndex, rowIndex }) =>
    this.setState({ scrollToColumn: columnIndex, scrollToRow: rowIndex })

  _columnStartIndex = 0
  _columnStopIndex = 0
  _rowStartIndex = 0
  _rowStopIndex = 0
  _pageSizeX = 0
  _pageSizeY = 0

  _onSectionRendered = ({ columnStartIndex, columnStopIndex, rowStartIndex, rowStopIndex }) => {
    this._columnStartIndex = columnStartIndex
    this._columnStopIndex = columnStopIndex
    this._rowStartIndex = rowStartIndex
    this._rowStopIndex = rowStopIndex
    this._pageSizeY = rowStopIndex - rowStartIndex
    this._pageSizeX = columnStopIndex - columnStartIndex
  }

  onKeyDown = (event) => {
    if (event.altKey || event.ctrlKey || event.shiftKey) return

    const { columns, scrollToColumn: _stc, scrollToRow: _str } = this.state
    const { rows } = this.props

    let scrollToColumn = _stc
    let scrollToRow = _str

    const columnCount = columns.length
    const rowCount = rows.length

    switch (event.key) {
      case "Home":
        scrollToRow = 0
        break

      case "End":
        scrollToRow = rowCount - 1
        break

      case 'ArrowDown':
        scrollToRow = Math.min(scrollToRow + 1, rowCount - 1)
        break

      case 'ArrowLeft':
        scrollToColumn = Math.max(scrollToColumn - 1, 0)
        break

      case 'ArrowRight':
        scrollToColumn = Math.min(scrollToColumn + 1, columnCount - 1)
        break

      case 'ArrowUp':
        scrollToRow = Math.max(scrollToRow - 1, 0)
        break

      case "PageUp":
        scrollToRow = Math.max(scrollToRow - this._pageSizeY, 0)
        break

      case "PageDown":
        scrollToRow = Math.min(scrollToRow + this._pageSizeY, rowCount - 1)
        break

      default:
        break
    }

    if (scrollToColumn !== _stc || scrollToRow !== _str) {
      event.preventDefault();
      this.setState({ scrollToColumn, scrollToRow });
    }
  }

  getRowHeight = () => this.props.rowHeight

  render() {
    const { rowHeight, rows, className } = this.props
    const { width, height, scrollToRow, scrollToColumn, widths, vertScrollBar, scrollLeft } = this.state

    return (
      <ResizeSensor onResize={this.onResize}>
        <div className={className} style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0 }}>
          {/* <Grid
            className="headerGrid"
            width={width - vertScrollBar}
            height={rowHeight}
            cellRenderer={this.renderHeaderCell}
            columnWidth={index => widths[index]}
            columnCount={widths.length}
            overscanColumns={0}
            overscanRows={10}
            scrollToColumn={scrollToColumn}
            estimatedRowHeight={rowHeight}
            rowHeight={this.getRowHeight}
            rowCount={1}
            scrollLeft={scrollLeft}
            ref={this.headerRef} /> */}

          <Grid  onKeyDown={this.onKeyDown}
            className="grid"
            width={width}
            height={height - rowHeight}
            cellRenderer={e => this.renderCell(e, scrollToRow)}
            noContentRenderer={this.renderNoCells}
            columnWidth={index => widths[index]}
            columnCount={widths.length}
            overscanCount={10}
            scrollToRow={scrollToRow}
            scrollToColumn={scrollToColumn}
            estimatedRowHeight={rowHeight}
            rowHeight={this.getRowHeight}
            rowCount={rows.length}
            onScroll={this.onScroll}
            onSectionRendered={this._onSectionRendered}
            onScrollbarPresenceChange={this.scrollBarPresenceChanged}
            ref={this.clientRef}
            children={this.renderCell}/>
        </div>
      </ResizeSensor>)
  }
}

function generateData(count, colCount) {
  var result = []

  for (var i = 0; i < count; i++) {
    var item = {}

    for (var c = 1; c <= colCount; c++)
      item["col" + c] = `* ${c} : ${i}`

    result.push(item);
  }

  return result
}

export default () => (<div className="bp3-dark"><TreeGrid rows={generateData(1000, 5)} className="client">
  <Column width={200} label="Column 1" dataKey="col1" minWidth={50} />
  <Column width={200} label="Column 2" dataKey="col2" minWidth={50} />
  <Column width={300} label="Column 3" dataKey="col3" minWidth={50} />
  <Column width={400} label="Column 4" dataKey="col4" minWidth={50} />
  <Column width={200} label="Column 5" dataKey="col5" minWidth={50} />
  <Column star dataKey="col6" />
</TreeGrid></div>)
