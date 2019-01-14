import React from 'react'
import { Column, TreeGrid } from './react-treegrid'

function generateData(count, colCount) {
  var result = []

  for (var i = 0; i < count; i++) {
    var item = {}

    for (var c = 1; c <= colCount; c++)
      item["col" + c] = `* ${c} : ${i} : some long text just to trim it if needed by column width`

    result.push(item);
  }

  return result
}

export default () => (<div className="bp3-dark">
  <TreeGrid rows={generateData(1000, 5)} className="client" style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0 }}>
    <Column width={200} label="Column 1" dataKey="col1" minWidth={50} className="center" />
    <Column width={200} label="Column 2" dataKey="col2" minWidth={50} className="right headerCenter"/>
    <Column width={300} label="Column 3" dataKey="col3" minWidth={50} className="center headerLeft"/>
    <Column width={400} label="Column 4" dataKey="col4" minWidth={50} />
    <Column width={200} label="Column 5" dataKey="col5" minWidth={50} />
    <Column star dataKey="col6" />
  </TreeGrid>
</div>)
