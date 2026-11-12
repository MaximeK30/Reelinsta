// Stockage : Upstash Redis si configuré, sinon mémoire (mode démo, non persistant).
import { Redis } from '@upstash/redis';

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;
const P = 'choreo:'; // préfixe : permet de partager la base avec le site mariage plus tard

export const isDemo = !redis;

const mem = globalThis.__choreoMem || (globalThis.__choreoMem = { kv: new Map(), sets: new Map(), hashes: new Map() });
const clone = (v) => (v === undefined || v === null ? null : JSON.parse(JSON.stringify(v)));

export async function get(key) {
  if (redis) return (await redis.get(P + key)) ?? null;
  return clone(mem.kv.get(key));
}
export async function set(key, value) {
  if (redis) return redis.set(P + key, value);
  mem.kv.set(key, clone(value));
}
export async function del(key) {
  if (redis) return redis.del(P + key);
  mem.kv.delete(key); mem.hashes.delete(key); mem.sets.delete(key);
}
export async function mget(keys) {
  if (!keys.length) return [];
  if (redis) return redis.mget(...keys.map((k) => P + k));
  return keys.map((k) => clone(mem.kv.get(k)));
}
export async function sadd(key, member) {
  if (redis) return redis.sadd(P + key, member);
  if (!mem.sets.has(key)) mem.sets.set(key, new Set());
  mem.sets.get(key).add(member);
}
export async function srem(key, member) {
  if (redis) return redis.srem(P + key, member);
  mem.sets.get(key)?.delete(member);
}
export async function smembers(key) {
  if (redis) return (await redis.smembers(P + key)) || [];
  return [...(mem.sets.get(key) || [])];
}
export async function hset(key, field, value) {
  if (redis) return redis.hset(P + key, { [field]: value });
  if (!mem.hashes.has(key)) mem.hashes.set(key, new Map());
  mem.hashes.get(key).set(field, clone(value));
}
export async function hgetall(key) {
  if (redis) return (await redis.hgetall(P + key)) || {};
  return Object.fromEntries([...(mem.hashes.get(key) || new Map())].map(([k, v]) => [k, clone(v)]));
}
