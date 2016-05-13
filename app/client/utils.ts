import * as jQuery from 'jquery'

export function toArray(obj) {
  return Object.keys(obj).map(key => obj[key])
}

export function groupBy(array, key) {
  let groups = {}
  if (key) {
    for (let item of array) {
      let value = key(item)
      if (!groups[value]) groups[value] = []
      groups[value].push(item)
    }
  } else {
    groups[''] = array
  }
  return groups
}

export function clone(obj) {
  return JSON.parse(JSON.stringify(obj)) // haha
}

export function map(obj, fn) {
  let result = []
  for (let key in obj) {
    result.push(fn(key, obj[key]))
  }
  return result
}

export function merge(obj, changed) {
  return jQuery.extend(obj, changed)
}

export function deepmerge(obj, changes) {
  return jQuery.extend(true, {}, obj, changes)
}

export function get(url: string) {
  return jQuery.get(url)
}

export function post(url: string, json?: any, cb?: Function) {
  // todo: cb()
  return jQuery.ajax({
    type: 'POST',
    url: url,
    data: json ? JSON.stringify(json) : null,
    contentType: 'application/json'
  })
}

export function del(url: string) {
  return jQuery.ajax({
    type: 'DELETE',
    url: url
  })
}

export function isodate() {
  return new Date().toISOString().substr(0, 19).replace('T', ' ')
}
