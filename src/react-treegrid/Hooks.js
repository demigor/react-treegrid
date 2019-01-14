import { useState, useEffect } from 'react'
import ResizeObserver from 'resize-observer-polyfill'

function getSize(element) {
  if (element)
    return { width: element.offsetWidth, height: element.offsetHeight }

  return {}
}

export function useSize(ref) {
  let [size, setSize] = useState(getSize(ref.current))

  useEffect(() => {
    let element = ref && ref.current

    setSize(getSize(element))

    if (element) {

      let resizeObserver = new ResizeObserver(() => setSize(getSize(element)))
      resizeObserver.observe(element)

      return () => {
        resizeObserver.disconnect(element)
        resizeObserver = null
      }
    }
  }, [ref.current])

  return size
}
