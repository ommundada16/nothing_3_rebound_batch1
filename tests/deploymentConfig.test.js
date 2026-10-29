import test from 'node:test';
import assert from 'node:assert/strict';
import {backendOrigin,configuredBackend} from '../scripts/deployment-config.mjs';
test('deployment uses an HTTPS backend origin and preserves the API path',()=>{assert.equal(backendOrigin('https://rebound-api-test.onrender.com/'),'https://rebound-api-test.onrender.com');assert.equal(configuredBackend({rewrites:[{source:'/api/:path*',destination:'https://rebound-api-test.onrender.com/api/:path*'}]}),'https://rebound-api-test.onrender.com');});
test('deployment rejects unset placeholders, local HTTP and credentials in committed routing',()=>{for(const input of [undefined,'http://localhost:8787','https://YOUR-REBOUND-BACKEND.onrender.com','https://user:secret@example.com','https://example.com/api','https://example.com?token=secret'])assert.throws(()=>backendOrigin(input));assert.throws(()=>configuredBackend({}));});
