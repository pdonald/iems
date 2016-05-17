import 'es6-promise'
import 'whatwg-fetch'
import * as extend from 'extend'

export function toArray(obj) {
  return Object.keys(obj).map(key => obj[key])
}

export function groupBy<T>(array: T[], key: (item: T) => string): { [key: string]: T[] } {
  let groups: { [key: string]: T[] } = {}
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

export function map<T, V>(obj: { [key: string]: T }, fn: (key: string, obj: T) => V): V[] {
  let result: V[] = []
  for (let key in obj) {
    result.push(fn(key, obj[key]))
  }
  return result
}

export function merge(obj, changed) {
  return extend(obj, changed)
}

export function deepmerge(obj, changes) {
  return extend(true, {}, obj, changes)
}

export function clone(obj) {
  return extend(true, {}, obj)
}

function checkStatus(response) {
  if (response.status >= 200 && response.status < 300) {
    return response
  } else {
    throw new Error(response.statusText)
  }
}

function parseJSON(response) {
  return response.json()
}

export function get(url: string) {
  return fetch(url).then(checkStatus).then(parseJSON)
}

export function post(url: string, json?: any) {
  return fetch(url, {
    cache: 'no-cache',
    method: 'POST',
    body: json ? JSON.stringify(json) : null,
    headers: {
      'Content-Type': 'application/json'
    }
  }).then(checkStatus).then(parseJSON)
}

export function del(url: string) {
  return fetch(url, { method: 'DELETE' }).then(checkStatus)
}

export function isodate() {
  return new Date().toISOString().substr(0, 19).replace('T', ' ')
}
