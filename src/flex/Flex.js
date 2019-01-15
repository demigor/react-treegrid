import React, { memo, forwardRef } from 'react'
import cn from 'classnames'
import './Flex.css'

export const flex = forwardRef((props, ref) => {
  let { flex, box, column, row, auto, align, alignSelf, center, star, horzAlign, vertAlign, wrap, basis, crop, hidden, inline,
    fullHeight, fullWidth, width, height, padding, margin, left, top, right, bottom, minWidth, maxWidth, minHeight, maxHeight,
    fixed, fixedLeft, fixedRight, absolute, absoluteLeft, absoluteRight, relative, zIndex,
    autoScroll, trim, style, children, className, innerRef,
    texts, // eslint-disable-line
    ...divProps } = props

  if (box)
    flex = false
  else
    flex = flex || center || column

  if (row)
    column = false

  let divStyle = {} //flex ? { ...flexStyle } : { ...boxStyle }

  if (fixed) {
    divStyle.position = 'fixed'
    divStyle.left = 0
    divStyle.top = 0
    divStyle.right = 0
    divStyle.bottom = 0
  }
  else if (fixedLeft) {
    divStyle.position = 'fixed'
    divStyle.left = 0
    divStyle.top = 0
    divStyle.bottom = 0
  }
  else if (fixedRight) {
    divStyle.position = 'fixed'
    divStyle.top = 0
    divStyle.right = 0
    divStyle.bottom = 0
  }
  else if (absolute) {
    divStyle.position = 'absolute'
    divStyle.left = 0
    divStyle.top = 0
    divStyle.right = 0
    divStyle.bottom = 0
  }
  else if (absoluteLeft) {
    divStyle.position = 'absolute'
    divStyle.left = 0
    divStyle.top = 0
    divStyle.bottom = 0
  }
  else if (absoluteRight) {
    divStyle.position = 'absolute'
    divStyle.top = 0
    divStyle.right = 0
    divStyle.bottom = 0
  }
  else if (relative) {
    divStyle.position = 'relative'
    // divStyle.left = 0
    // divStyle.top = 0
    // divStyle.right = 0
    // divStyle.bottom = 0
  }

  if (hidden) {
    divStyle.display = 'none'
  }

  if (column) {
    divStyle.flexDirection = 'column'
    divStyle.justifyContent = 'flex-start'
  }
  else if (flex) {
    divStyle.alignContent = 'flex-start'
  }

  if (wrap && flex) {
    divStyle.flexWrap = 'wrap'
  }

  if (alignSelf) {
    divStyle.alignSelf = alignSelf
  }

  if (autoScroll) {
    divStyle.overflowY = 'auto'
    divStyle.overflowX = 'hidden'
  }
  else if (crop) {
    divStyle.overflowY = 'hidden'
    divStyle.overflowX = 'hidden'
  }

  if (fullWidth) {
    width = '100%'
  }

  if (fullHeight) {
    height = '100%'
  }

  if (left) {
    divStyle.left = left
  }

  if (top) {
    divStyle.top = top
  }

  if (right) {
    divStyle.right = right
  }

  if (bottom) {
    divStyle.bottom = bottom
  }

  if (minWidth) {
    divStyle.minWidth = minWidth
  }

  if (maxWidth) {
    divStyle.maxWidth = maxWidth
  }

  if (minHeight) {
    divStyle.minHeight = minHeight
  }

  if (maxHeight) {
    divStyle.maxHeight = maxHeight
  }

  if (width) {
    divStyle.width = width
  }

  if (height) {
    divStyle.height = height
  }

  if (height || width || auto) {
    divStyle.flexGrow = 0
    divStyle.flexShrink = 0
    divStyle.flexBasis = 'auto'
  }
  if (star) {
    let _star = typeof star === 'number' ? star : 1
    divStyle.flexGrow = _star
    divStyle.flexShrink = _star
    divStyle.flexBasis = 0
  }

  if (basis) {
    divStyle.flexBasis = basis
  }

  if (trim) {
    divStyle.whiteSpace = 'nowrap'
    divStyle.textOverflow = 'ellipsis'
  }

  if (zIndex) {
    divStyle.zIndex = zIndex
  }

  if (padding) {
    divStyle.padding = padding
  }

  if (margin) {
    divStyle.margin = margin
  }

  if (flex) {
    if (center) {
      divStyle.alignItems = 'center'
      divStyle.alignContent = 'center'
      divStyle.justifyContent = 'center'
    } else {
      if (horzAlign) {

        switch (horzAlign) {
          case "left": horzAlign = "flex-start"; break
          case "right": horzAlign = "flex-end"; break
        }

        if (column)
          divStyle.alignContent = horzAlign
        else
          divStyle.justifyContent = horzAlign
      }

      if (vertAlign) {
        switch (vertAlign) {
          case "top": vertAlign = "flex-start"; break
          case "bottom": vertAlign = "flex-end"; break
        }

        if (column)
          divStyle.justifyContent = vertAlign
        else
          divStyle.alignContent = vertAlign
      }

      if (align) {
        divStyle.alignItems = align
      }
    }
  }

  if (inline && !hidden) {
    divStyle.display = flex ? "inline-flex" : "inline-block"
  }

  if (style)
    divStyle = { ...divStyle, ...style }

  return <div {...divProps} ref={ref || innerRef} className={cn(flex ? "flex" : "box", className)} style={divStyle}>{children}</div>
})

export const Flex = memo(flex)
Flex.defaultProps = { flex: true }

export const Box = memo(flex)
Box.defaultProps = { box: true }
