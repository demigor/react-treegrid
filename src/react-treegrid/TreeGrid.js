import React, { memo, useState, useEffect, useMemo, useCallback } from 'react'
import cn from 'classnames'
import { unstable_scheduleCallback as defer } from 'scheduler'
import { TreeAdapter } from './TreeAdapter'
import { Table } from './Table'
import './TreeGrid.css'

function getCellStyle(args, rowStyle) {
  return typeof rowStyle === "function" ? rowStyle(args) : rowStyle
}

export const TreeGrid = memo(props => {

  let { items, onGetId, onGetChildren, onHasChildren, onItemClick, onMore, dataCache, selectedId, version, maxVisibleRowCount, expanderColumn, expanderIndent, disableExpander, getRowClassName, ...rest } = props
  let { rowHeight, disableHeader } = props

  let [state, setState] = useState(() => {
    let adapter = new TreeAdapter({ items, onGetId, onGetChildren, onHasChildren, onChange, cache: dataCache })
    return { adapter, list: adapter.items, lastItems: items, selectedId }
  })

  let more = useMemo(() => {
    if (onMore) {
      let requesting = false
      return () => {
        if (!requesting) {
          requesting = true
          defer(() => onMore().then(() => requesting = false))
        }
      }
    }
  }, [onMore, version])

  let { adapter, list } = state

  if (onGetId) adapter.onGetId = onGetId
  if (onGetChildren) adapter.onGetChildren = onGetChildren
  if (onHasChildren) adapter.onHasChildren = onHasChildren

  useEffect(() => void (setState(s => ({ ...s, list: adapter.setItems(items, version, false) }))), [items, version])

  function onChange(list) {
    setState(s => ({ ...s, list }))
  }

  function expand(e, index, action) {
    e.stopPropagation()
    adapter.setExpanded(index, expand)
  }

  let rowCount = list.length
  let fixHeight = maxVisibleRowCount ? (maxVisibleRowCount < rowCount ? maxVisibleRowCount : rowCount) * rowHeight + (disableHeader ? 0 : rowHeight) : undefined

  let rowClassName = useCallback(args => {
    let { rowIndex } = args
    return {
      ...getCellStyle(args, getRowClassName),
      "selected-row": rowIndex >= 0 && adapter.matchId(rowIndex, selectedId),
      "odd-row": rowIndex % 2 === 0
    }
  }, [onItemClick])

  let cellRenderer = useMemo(() => {
    if (!disableExpander)
      return ({ rowIndex, columnIndex }, cellProps) => {
        if (expanderColumn === columnIndex) {

          let { expanded, expandable, level } = adapter.getViewInfo(rowIndex)

          if (expandable) {
            cellProps.children = (<>
              <div style={{ marginLeft: level * expanderIndent, width: expanderIndent }} className={cn("expander", { "expanded": expanded })} onPointerDown={e => e.stopPropagation()} onPointerUp={e => expand(e, rowIndex, "toggle")} />
              {cellProps.children}
            </>)
          }
          cellProps.style = { ...cellProps.style, paddingLeft: (level + 1) * expanderIndent }
        }
      }
  }, [disableExpander, expanderColumn, expanderIndent])


  return (<Table {...rest} rows={list} height={fixHeight} onMore={more} getRowClassName={rowClassName} cellRenderer={cellRenderer} />)
})

TreeGrid.defaultProps = {
  expanderColumn: 0,
  expanderIndent: 22,
  disableExpander: false,
  items: [],
  onGetId: null, // () => item.Id
  onGetChildren: null, // () => []
  onHasChildren: null, // () => true/false
  onItemClick: null, // () => {}
  onSortChange: null, // () => {}
  onMore: null, // () => {}
  maxVisibleRowCount: undefined,
  rowHeight: 30,
  selectedId: undefined,
  interactive: false,
  emptyText: undefined
}
/*

function newRowRenderer({ className, columns, index, key, onRowClick, onRowDoubleClick, onRowMouseOut, onRowMouseOver, onRowRightClick, rowData, style }) {
  const a11yProps = {}

  if (onRowClick || onRowDoubleClick || onRowMouseOut || onRowMouseOver || onRowRightClick) {
    a11yProps['aria-label'] = 'row'
    a11yProps.tabIndex = 0

    if (onRowClick) {
      a11yProps.onClick = event =>
        onRowClick({ event, index, rowData })
    }
    if (onRowDoubleClick) {
      a11yProps.onDoubleClick = event =>
        onRowDoubleClick({ event, index, rowData })
    }
    if (onRowMouseOut) {
      a11yProps.onMouseOut = event => onRowMouseOut({ event, index, rowData })
    }
    if (onRowMouseOver) {
      a11yProps.onMouseOver = event => onRowMouseOver({ event, index, rowData })
    }
    if (onRowRightClick) {
      a11yProps.onContextMenu = event =>
        onRowRightClick({ event, index, rowData })
    }
  }

  return (
    <div
      {...a11yProps}
      className={className}
      key={key}
      role="row"
      style={style}>
      {columns}
    </div>
  )
}

function calcObject(obj, args) {
  return typeof obj === 'function' ? obj(args) : obj
}

class Table extends RV_Table {

  static defaultProps = {
    ...RV_Table.defaultProps,
    rowRenderer: newRowRenderer,
    expanderColumn: 0,
    expanderIndent: 22,
    disableExpander: false
  }

  static propTypes = {
    ...RV_Table.propTypes,
    adapter: PropTypes.object,
    expanderColumn: PropTypes.number,
    expanderIndent: PropTypes.number,
    disableExpander: PropTypes.bool
  }

  _getFlexStyleForColumn = (column, customStyle = {}) => {
    const { star, width, maxWidth, minWidth } = column.props
    const factor = (typeof star === 'number') ? star : (star ? 1 : 0)
    const flexValue = `${factor} ${factor} ${width}px`

    const style = {
      ...customStyle,
      flex: flexValue,
      msFlex: flexValue,
      WebkitFlex: flexValue
    }

    if (maxWidth) {
      style.maxWidth = maxWidth
    }

    if (minWidth) {
      style.minWidth = minWidth
    }

    return style
  }

  _createColumn = ({ column, columnIndex, isScrolling, parent, rowData, rowIndex, rowClass, rowStyle, testid }) => {
    const {
      cellStyleGetter,
      cellDataGetter,
      cellRenderer,
      className,
      columnData,
      dataKey,
      id
    } = column.props

    const cellData = cellDataGetter({ columnData, dataKey, rowData })
    let renderedCell = cellRenderer({ cellData, columnData, columnIndex, dataKey, isScrolling, parent, rowData, rowIndex, rowClass, rowStyle, testid })

    let style = this._cachedColumnStyles[columnIndex]

    const title = typeof renderedCell === 'string' ? renderedCell : null

    const { disableExpander, expanderColumn, expanderIndent, adapter } = this.props

    if (expanderColumn === columnIndex && !disableExpander && adapter) {
      let { expanded, expandable, level } = adapter.getViewInfo(rowIndex)
      const indent = (style.paddingLeft || 0) + level * expanderIndent

      if (expandable) {
        style = { ...style, display: "flex", alignItems: 'center', paddingLeft: indent }

        renderedCell = (
          <>
            <div style={{ width: expanderIndent, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyItems: 'center' }} onPointerDown={e => e.stopPropagation()} onPointerUp={e => this._expand(e, rowIndex, "toggle")}>{expanded ? <Icon icon="chevron-down" title="collapse" testid={testid + "-collapse-" + rowIndex} /> : <Icon icon="chevron-right" title="expand" testid={testid + "-expand-" + rowIndex} />}</div>
            {renderedCell}
          </>)
      }
      else {
        style = { ...style, paddingLeft: indent + expanderIndent }
      }
    }

    if (cellStyleGetter) {
      style = cellStyleGetter({ cellData, columnData, dataKey, rowData, style }) || style
    }

    // Avoid using object-spread syntax with multiple objects here,
    // Since it results in an extra method call to 'babel-runtime/helpers/extends'
    // See PR https://github.com/bvaughn/react-virtualized/pull/942
    return (
      <div
        aria-describedby={id}
        className={cn('ReactVirtualized__Table__rowColumn', className)}
        key={columnIndex}
        role="gridcell"
        style={style}
        title={title}
        testid={testid + "-" + id}>
        {renderedCell}
      </div>
    )
  }

  _createRow = ({ rowIndex: index, isScrolling, key, parent, style }) => {
    const {
      children,
      onRowClick,
      onRowDoubleClick,
      onRowRightClick,
      onRowMouseOver,
      onRowMouseOut,
      rowClassName,
      rowGetter,
      rowRenderer,
      rowStyle,
      testid
    } = this.props

    const { scrollbarWidth } = this.state

    const rowData = rowGetter({ index })
    const rowClass = calcObject(rowClassName, { index, rowData })
    const rowStyleObject = calcObject(rowStyle, { index, rowData })
    const className = cn('ReactVirtualized__Table__row', rowClass)
    const flattenedStyle = {
      ...style,
      ...rowStyleObject,
      height: this._getRowHeight(index),
      overflow: 'hidden',
      paddingRight: scrollbarWidth,
    }

    const columns = React.Children.toArray(children).map(
      (column, columnIndex) =>
        this._createColumn({
          column,
          columnIndex,
          isScrolling,
          parent,
          rowData,
          rowIndex: index,
          scrollbarWidth,
          rowClass,
          rowStyle: rowStyleObject,
          testid
        })
    )

    return rowRenderer({
      className,
      columns,
      index,
      isScrolling,
      key,
      onRowClick,
      onRowDoubleClick,
      onRowRightClick,
      onRowMouseOver,
      onRowMouseOut,
      rowData,
      style: flattenedStyle,
      testid
    })
  }

  _expand = (e, index, expand) => {
    e.stopPropagation()
    this.props.adapter.setExpanded(index, expand)
  }
}

function cleanTreeGridProps(props) {
  delete props.height
  delete props.width
  delete props.rowCount
  delete props.rowGetter
  return props
}

export default class TreeGrid extends React.PureComponent {

  static propTypes = cleanTreeGridProps({
    ...Table.propTypes,
    //to-do
    onSortChange: PropTypes.func,
    sort: PropTypes.string
  })

  static defaultProps = cleanTreeGridProps({
    ...Table.defaultProps,
    items: [],
    onGetId: null, // () => item.Id
    onGetChildren: null, // () => []
    onHasChildren: null, // () => true/false
    onRowClick: null, // () => {}
    onItemClick: null, // () => {}
    onSortChange: null, // () => {}
    onMore: null, // () => {}
    noRowsRenderer: null,
    maxVisibleRowCount: undefined,
    rowHeight: 30,
    headerHeight: 30,
    selectedId: undefined,
    interactive: false,
    noRowsText: "List is empty"
  })

  constructor(props) {
    super(props)

    const adapter = new TreeAdapter({
      items: props.items,
      onGetId: props.onGetId,
      onGetChildren: props.onGetChildren,
      onHasChildren: props.onHasChildren,
      onChange: this._onChange,
      cache: props.dataCache
    })

    this.state = {
      adapter: adapter,
      list: adapter.items,
      selectedId: props.selectedId
    }
  }

  static getDerivedStateFromProps(props, state) {

    const { adapter, lastItems } = state
    const { onGetId, onGetChildren, onHasChildren } = props

    if (onGetId) adapter.onGetId = onGetId
    if (onGetChildren) adapter.onGetChildren = onGetChildren
    if (onHasChildren) adapter.onHasChildren = onHasChildren

    if (lastItems !== props.items) {
      return { list: adapter.setItems(props.items, props.version, false), lastItems: props.items }
    }

    return null
  }

  componentDidUpdate(prevProps) {
    if (prevProps.items !== this.props.items) {
      this.tableRef.current?.forceUpdateGrid() // not sure that it helps at all
    }
  }

  tableRef = React.createRef()

  _onChange = (items) => { this.setState({ list: items }) }

  _onRowClick = (data) => {
    const { onRowClick, onItemClick } = this.props
    const { adapter } = this.state

    if (onRowClick || onItemClick) {
      const { rowData } = data

      if (onRowClick) onRowClick(data)
      if (onItemClick) onItemClick(rowData)

      this.setState({ selectedId: adapter.onGetId(rowData) })
      this.tableRef.current.forceUpdateGrid()
    }
  }

  _onSort = (sorting) => {
    const { onSort } = this.props
    if (onSort) {
      onSort(this._pack(sorting))
    }
    else {
      const { adapter } = this.state
      this.setState({ ...sorting, list: adapter.sort(sorting) })
    }
  }

  _noRowsRenderer = () => (<div className="noRows">{this.props.noRowsText}</div>)

  _rowClassNameSelected = (index, interactive, adapter, selectedId) => {
    if (index >= 0 && adapter.matchId(index, selectedId))
      return "selectedRow"

    return this._rowClassName(index, interactive)
  }

  _rowClassName = (index, interactive) => {
    if (index < 0) {
      return "headerRow"
    }

    let result = index % 2 === 0 ? "evenRow" : "oddRow"

    if (interactive) {
      result = cn(result, "interactive")
    }

    return result
  }

  _pack = ({ sortBy, sortDirection }) => (sortDirection === "ASC" ? sortBy : "-" + sortBy)

  _unpack = (sorting) => {
    if (sorting === undefined)
      return {}

    if (sorting[0] === "-")
      return { sortBy: sorting.slice(1), sortDirection: "DESC" }

    return { sortBy: sorting, sortDirection: "ASC" }
  }

  requestMore(onMore) {
    if (!this.requesting) {
      this.requesting = true
      defer(() => onMore().then(() => this.requesting = false))
    }
  }

  render() {

    const { items, onGetId, onGetChildren, onHasChildren, onSort, selectedItem, interactive, noRowsText, // eslint-disable-line
      onRowClick, onItemClick, onMore, overscan, noRowsRenderer, sort, children, rowClassName, maxVisibleRowCount, minHeight, minWidth, testid, ...props } = this.props
    const { sortBy, sortDirection } = this._unpack(sort)
    const { list, sortBy: _sortBy, sortDirection: _sortDirection } = this.state

    let _rowClassName

    if (onItemClick) {
      const { adapter, selectedId } = this.state
      _rowClassName = ({ index, rowData }) => cn(this._rowClassNameSelected(index, interactive, adapter, selectedId), calcObject(rowClassName, { index, rowData }))
    } else {
      _rowClassName = ({ index, rowData }) => cn(this._rowClassName(index, interactive), calcObject(rowClassName, { index, rowData }))
    }

    let rowGetter = ({ index }) => list[index]

    if (onMore) {
      rowGetter = ({ index }) => {

        if (index === list.length - 1)
          this.requestMore(onMore)

        return list[index]
      }
    }

    const rowCount = list.length
    const fixHeight = maxVisibleRowCount ? (maxVisibleRowCount < rowCount ? maxVisibleRowCount : rowCount) * this.props.rowHeight + (this.props.disableHeader ? 0 : this.props.headerHeight) : undefined

    return (
      <Flex height={fixHeight} minHeight={minHeight} minWidth={minWidth}>
        <AutoSizer style={{ overflow: 'hidden', width: undefined, height: undefined }}>
          {({ width, height }) => (
            <Table
              {...props}
              ref={this.tableRef}
              height={height}
              overscanRowCount={overscan}
              rowGetter={rowGetter}
              rowCount={rowCount}
              onRowClick={(onRowClick || onItemClick) && this._onRowClick}
              rowClassName={_rowClassName}
              noRowsRenderer={noRowsRenderer || this._noRowsRenderer}
              sort={this._onSort}
              sortBy={_sortBy || sortBy}
              sortDirection={_sortDirection || sortDirection}
              adapter={this.state.adapter}
              width={width}
              testid={testid}>
              {children}
            </Table>
          )}
        </AutoSizer>
      </Flex>
    )
  }
}
*/