import { check, sleep } from 'k6';
import { randInt } from './random.js';

export function checkOk(res, name = 'request ok') {
  return check(res, {
    [name]: (r) => !!r && r.status >= 200 && r.status < 300,
  });
}

export function think(minMs, maxMs) {
  const min = Math.max(0, Number(minMs || 0));
  const max = Math.max(min, Number(maxMs || min));
  const ms = randInt(min, max);
  sleep(ms / 1000);
}
