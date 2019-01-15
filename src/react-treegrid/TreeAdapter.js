export class TreeAdapter {

  /*
    node structure
    {
      level: int // indenting
      expanded: bool // expanded status
      nodes: {} // nodes of once-expanded items
    }
  */

  items = []
  onGetId = (item) => item.Id
  onGetChildren = () => null // ({ id, item, setChildrenCallback })
  onHasChildren = () => this.onGetChildren !== null

  constructor({ items = [], cache, onGetId = null, onHasChildren = null, onGetChildren = null, onChange = null }) {

    this._rootItems = items

    if (onGetId)
      this.onGetId = onGetId

    if (onHasChildren)
      this.onHasChildren = onHasChildren

    if (onGetChildren)
      this.onGetChildren = onGetChildren

    this._root = { level: 0, nodes: {} }
    this._tree = {}

    if (cache) {
      cache.getExpandedIds = this.getExpandedIds
      cache.setChildren = this.setChildren
      cache.setExpanded = this.setExpanded
      cache.expand = this.expand
      cache.collapse = this.collapse
      cache.beginUpdate = this._beginUpdate
      cache.endUpdate = this._endUpdate
    }

    this.onChange = onChange
    this._refresh()
  }

  getExpandedIds = () => {
    const result = []
    this.getExpandedIdsFromNodes(this._root.nodes, result)
    return result
  }

  getExpandedIdsFromNodes(nodes, result) {
    if (nodes)
      for (var node in nodes) {
        var obj = nodes[node]
        if (obj.expanded) {
          result.push(node)
          this.getExpandedIdsFromNodes(obj.nodes, result)
        }
      }
  }

  setItems(items, version, notify = true) {
    this._beginUpdate()
    this._rootItems = items

    // drop expanded & children info if version changes
    if (version !== this._version) {
      this._version = version
      this._root.nodes = {}

      // clear expanded/collapsed information
      this._tree = {}
    }

    this._refresh()
    return this._endUpdate(notify)
  }

  _refresh() {
    this.items = []
    this._nodes = []
    this._appendItems(this._rootItems, this._root, this.items, this._nodes)
  }

  _appendItems(source, owner, targetItems, targetNodes) {

    if (source) {
      for (var i = 0; i < source.length; i++) {
        const item = source[i]
        const id = this.onGetId(item)
        const index = targetItems.length

        targetItems.push(item)

        if (owner.level > 0) {
          targetNodes[index] = owner
        }

        const node = owner.nodes[id]
        if (this._getNodeExpanded(node)) {
          const children = this._tree[id]

          if (Array.isArray(children))
            this._appendItems(children, node, targetItems, targetNodes)
        }
      }

      if (owner.level === 0) {
        // to keep targetNodes indexed in sync with targetItems,
        // we have to set min and max bounds of the targetNodes
        // by setting corresponding elements

        if (targetNodes[0] === undefined)
          targetNodes[0] = undefined

        const maxIndex = targetItems.length - 1

        if (targetNodes[maxIndex] === undefined)
          targetNodes[maxIndex] = undefined
      }
    }
  }

  _countItems(source, owner) {

    if (source) {
      let result = source.length

      for (var i = 0; i < source.length; i++) {
        const item = source[i]
        const id = this.onGetId(item)
        const node = owner.nodes[id]

        if (this._getNodeExpanded(node)) {
          const children = this._tree[id]

          if (Array.isArray(children))
            result += this._countItems(children, node)
        }
      }

      return result
    }

    return 0
  }

  _updates = 0

  _beginUpdate = () => {
    if (this._updates === 0) {
      this._lastItems = this.items
    }
    this._updates++
  }

  _endUpdate = (notify = true) => {
    this._updates--

    if (notify && this._updates === 0 && this._lastItems !== this.items && this.onChange)
      this.onChange(this.items)

    return this.items
  }

  _getComparer({ sortBy, sortDirection }) {
    const cmp = sortDirection === "ASC" ? this._traverseComparer : this._reverseComparer
    return (a, b) => cmp(a[sortBy], b[sortBy])
  }

  sort({ sortBy, sortDirection }) {
    const comparer = this._getComparer({ sortBy, sortDirection })
    this._beginUpdate()
    this._rootItems.sort(comparer)
    this._refresh()
    return this._endUpdate()
  }

  _reverseComparer = (a, b) => - this._traverseComparer(a, b)

  _traverseComparer = (a, b) => {
    if (a === undefined && b === undefined) return 0

    if (a === undefined) return 1

    if (b === undefined) return -1

    return a > b ? 1 : a < b ? -1 : 0
  }

  setChildren = (item, children) => this._updateItem(item, undefined, ({ id }) => void (this._tree[id] = children))

  _getNodeExpanded = (node) => (node && node.expanded) || false

  _updateItem(item, index, mutator) {
    if (index === undefined)
      index = this.items.indexOf(item)

    const oldId = this.onGetId(item)

    if (index < 0) {
      mutator(item, { item, id: oldId })
      return this.items
    }

    this._beginUpdate()

    const owner = this._getOwner(index)

    const oldNode = owner.nodes[oldId]
    const oldExpanded = this._getNodeExpanded(oldNode)
    let deleteCount = oldExpanded ? this._countItems(this._tree[oldId], oldNode) : 0

    const newItem = mutator({ item, owner, node: oldNode, id: oldId }) || item
    const itemChanged = newItem !== item

    const newId = itemChanged ? this.onGetId(newItem) : oldId
    const newNode = !itemChanged && oldNode ? oldNode : owner.nodes[newId]
    const newExpanded = this._getNodeExpanded(newNode)
    const newItems = itemChanged ? [newItem] : []
    const newNodes = itemChanged ? [owner] : []

    const startIndex = index + (itemChanged ? 0 : 1)

    if (itemChanged) {
      deleteCount++
    }

    if (newExpanded) {
      let children = this._tree[newId]

      if (children === undefined && this.onGetChildren !== null) {
        children = this.onGetChildren({ id: newId, item, setChildren: this.setChildren })
        this._tree[newId] = children
      }

      this._appendItems(children, newNode, newItems, newNodes)
    }

    const insertCount = newItems.length + (itemChanged ? 1 : 0)

    if (deleteCount > 0 || insertCount > 0) {
      this.items = this.items.slice()
      this.items.splice(startIndex, deleteCount, ...newItems)
      this._nodes = this._nodes.slice()
      this._nodes.splice(startIndex, deleteCount, ...newNodes)
    }
    return this._endUpdate()
  }

  _getOwner = (index) => this._nodes[index] || this._root

  _getExpanded = (item, index) => this._getNodeExpanded(this._getOwner(index).nodes[this.onGetId(item)])

  _setExpanded(item, index, expanded) {
    const oldExpanded = this._getExpanded(item, index)

    if (expanded === "toggle") expanded = !oldExpanded

    if (expanded === oldExpanded) return this.items

    return this._updateItem(item, index, ({ id, owner, node }) => {
      if (expanded) {
        if (node === undefined) {
          owner.nodes[id] = node = { level: owner.level + 1, expanded: true, nodes: {} }
        }
        else {
          node.expanded = true
        }
      }
      else {
        if (node !== undefined) {
          node.expanded = false
        }
      }
    })
  }

  // expands/collapses item with index
  setExpanded = (index_item, expanded) => {

    let index, item

    if (typeof index_item === 'number') {
      index = index_item
      item = this.items[index]
    } else {
      item = index_item
      index = this.items.indexOf(item)
    }

    this._setExpanded(item, index, expanded)
  }

  expand = (index_item) => this.setExpanded(index_item, true)
  collapse = (index_item) => this.setExpanded(index_item, false)

  // replace item with newItem
  replaceItem = (item, newItem) => this._updateItem(item, undefined, () => newItem)

  _hasChildren(item, id) {
    const children = this._tree[id]

    if (children === undefined)
      return this.onHasChildren && this.onHasChildren(item)

    return children !== null && children.length > 0
  }

  // fast check whether item has expand/collapse icon
  hasChildren = (item) => this._hasChildren(item, this.onGetId(item))

  getViewInfo = (index) => {
    const item = this.items[index]
    const id = this.onGetId(item)
    const expandable = this._hasChildren(item, id)

    const owner = this._getOwner(index)
    const level = owner.level

    const expanded = this._getNodeExpanded(owner.nodes[id])

    return { level, expanded, expandable }
  }

  matchId = (index, id) => this.onGetId(this.items[index]) === id
}