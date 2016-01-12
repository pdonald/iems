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
