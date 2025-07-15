import dotenv from 'dotenv'
import axios from 'axios'

dotenv.config()
const API_KEY = process.env.PUBMED_API_KEY
if (!API_KEY) throw new Error('Please set PUBMED_API_KEY in .env')

/**
 * ESearch: find UIDs matching a query
 * @param {object} params
 * @param {string} params.db - database (e.g. 'pubmed')
 * @param {string} params.term - search term
 * @param {number} params.retmax - max results
 * @param {number} params.retstart - offset
 * @param {string} params.usehistory - 'y' or 'n'
 */
export async function esearch({ db = 'pubmed', term, retmax = 20, retstart = 0, usehistory = 'n' }) {
  const url = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi'
  const res = await axios.get(url, {
    params: { db, term, retmax, retstart, usehistory, api_key: API_KEY, retmode: 'json' }
  })
  return res.data.esearchresult
}

/**
 * ESummary: retrieve summaries for UIDs
 * @param {object} params
 * @param {string} params.db
 * @param {string|string[]} params.id - comma-separated or array of UIDs
 */
export async function esummary({ db = 'pubmed', id }) {
  const url = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi'
  const idParam = Array.isArray(id) ? id.join(',') : id
  const res = await axios.get(url, {
    params: { db, id: idParam, api_key: API_KEY, retmode: 'json' }
  })
  return res.data.result
}

/**
 * EFetch: download full records (e.g. abstracts)
 * @param {object} params
 * @param {string} params.db
 * @param {string|string[]} params.id
 * @param {string} params.rettype
 * @param {string} params.retmode
 */
export async function efetch({ db = 'pubmed', id, rettype = 'abstract', retmode = 'text' }) {
  const url = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi'
  const idParam = Array.isArray(id) ? id.join(',') : id
  const res = await axios.get(url, {
    params: { db, id: idParam, rettype, retmode, api_key: API_KEY }
  })
  return res.data
}
