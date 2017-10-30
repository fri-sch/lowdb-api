/*!
 * lowdb-api
 * Copyright(c) 2017 Rubens Mariuzzo
 * MIT Licensed
 */

'use strict'

/**
 * Module dependencies
 * @private
 */

const url = require('url')
const lowdb = require('lowdb')
const lodashId = require('lodash-id')

/**
 * Module exports.
 * @public
 */

module.exports = lowdbApi

/**
 * @typedef {Object} Options
 * @property {String} prefix
 * @property {String} adapter
 */

/**
 * @param {Options} options
 * @return {Function}
 * @public
 */

function lowdbApi(file, options = {}) {

  // Validate file path.
  if (!file) {
    throw new TypeError('file path required')
  }

  if (typeof file !== 'string') {
    throw new TypeError('file path must be a string')
  }

  // Normalize optional prefix.
  if (options.prefix) {
    if (typeof options.prefix !== 'string') {
      throw new TypeError('options.prefix must be a string')
    }
    if (!options.prefix.endsWith('/')) {
      options.prefix += '/'
    }
  }

  // Create the lowdb database instance.
  const Adapter = require(options.adapter || 'lowdb/adapters/FileSync')
  const db = lowdb(new Adapter(file))
  db._.mixin(lodashId);

  /**
   * Middleware function.
   */

  return function lowdbApi(req, res) {

    // Remove the optional prefix from the path name.
    const uri = url.parse(req.url)
    let pathname = uri.pathname
    if (options.prefix && pathname.indexOf(option.prefix) === 0) {
      pathname = pathname.substr(0, options.prefix.length)
    }

    if (pathname.startsWith('/')) {
      pathname = pathname.substr(1)
    }

    // Parse path into segments and extract common path parts.
    const segments = pathname.split(/\/+/)
    const [collection, id] = segments
    const parsedId = parseId(id)

    // Operate upon request method and segments.
    switch(req.method) {

      case 'GET':

        if (segments.length !== 1 && segments.length !== 2) {
          throw new Error(`path not supported: ${pathname}`)
        }

        // Get all resources.
        if (segments.length === 1) {
          const list = all(db, collection)
          return res.status(200).send(list)
        }

        // Get a specific resource.
        if (segments.length === 2) {
          const item = get(db, collection, parsedId)
          return res.status(200).send(item)
        }

      case 'POST':

        if (segments.length !== 1) {
          throw new Error(`path not supported: ${pathname}`)
        }

        // Create a new resource.
        const inserted = insert(db, collection, req.body)
        return res.status(201).send(inserted)

      case 'PUT':

        if (segments.length !== 2) {
          throw new Error(`path not supported: ${pathname}`)
        }

        const updated = update(db, collection, parsedId, req.body)
        return res.status(200).send(updated)

      case 'DELETE':

        if (segments.length !== 2) {
          throw new Error(`path not supported: ${pathname}`)
        }

        const deleted = remove(db, collection, parsedId)

        if (deleted) {
          return res.status(200).send(deleted)
        } else {
          return notFound(res)
        }
    }
  }
}

/**
 * lowdb wrapper functions.
 * @private
 */

function all(db, key) {
  return db.get(key).value();
}

function get(db, key, id) {
  const parsedId = parseInt(id, 10);
  if (isNaN(parsedId)) throw new Error('Not a number: ' + id);
  return db.get(key).getById(parsedId).value();
}

function insert(db, key, data) {
  const lastInserted = db.get(key).maxBy('id').value();
  const nextId = lastInserted ? lastInserted.id + 1 : 1;
  data.id = nextId;
  db.get(key).push(data).write();
  return data;
}

function update(db, key, id, partial) {
  db.get(key).updateById(id, partial).write();
  return get(db, key, id)
}

function remove(db, key, id) {
  const data = get(db, key, id);
  db.get(key).removeById(id).write();
  return data;
}

function replace(db, key, id, data) {
  db.get(key).replaceById(id, data).write();
  return get(db, key, id);
}

/**
 * Utility functions
 * @private
 */

function parseId(str) {
  let parsed = new Number(str)
  if (isNaN(parsed)) {
    parsed = str
  }
  return parsed
}

function notFound(res) {
  res.status(404).send({
    error: {
      code: 'ERROR_NOT_FOUND',
      message: 'Not found'
    }
  })
}