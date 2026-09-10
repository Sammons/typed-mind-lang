import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EmittedNameAllocator } from './emitted-name-allocator.ts';

describe('EmittedNameAllocator', () => {
  it('reserves the first candidate when available', () => {
    const allocator = new EmittedNameAllocator();
    const name = allocator.reserve('key1', ['Alpha', 'Beta']);
    assert.equal(name, 'Alpha');
  });

  it('returns the same name for the same key', () => {
    const allocator = new EmittedNameAllocator();
    const first = allocator.reserve('key1', ['Alpha']);
    const second = allocator.reserve('key1', ['Beta']);
    assert.equal(first, 'Alpha');
    assert.equal(second, 'Alpha');
  });

  it('skips taken candidates and falls back to suffix', () => {
    const allocator = new EmittedNameAllocator();
    allocator.reserve('key1', ['Name']);
    const second = allocator.reserve('key2', ['Name']);
    assert.equal(second, 'Name2');
  });

  it('increments suffix when collisions stack', () => {
    const allocator = new EmittedNameAllocator();
    allocator.reserve('key1', ['Name']);
    allocator.reserve('key2', ['Name']);
    const third = allocator.reserve('key3', ['Name']);
    assert.equal(third, 'Name3');
  });

  it('nameFor returns undefined for unknown keys', () => {
    const allocator = new EmittedNameAllocator();
    assert.equal(allocator.nameFor('unknown'), undefined);
  });

  it('nameFor returns the reserved name', () => {
    const allocator = new EmittedNameAllocator();
    allocator.reserve('key1', ['Widget']);
    assert.equal(allocator.nameFor('key1'), 'Widget');
  });

  it('clear removes all reservations', () => {
    const allocator = new EmittedNameAllocator();
    allocator.reserve('key1', ['Alpha']);
    allocator.clear();
    assert.equal(allocator.nameFor('key1'), undefined);
    const name = allocator.reserve('key2', ['Alpha']);
    assert.equal(name, 'Alpha');
  });

  it('skips empty-string candidates', () => {
    const allocator = new EmittedNameAllocator();
    const name = allocator.reserve('key1', ['', 'Fallback']);
    assert.equal(name, 'Fallback');
  });

  it('uses Generated as default base when all candidates empty', () => {
    const allocator = new EmittedNameAllocator();
    const name = allocator.reserve('key1', ['']);
    assert.equal(name, 'Generated2');
  });

  it('picks second candidate when first is taken', () => {
    const allocator = new EmittedNameAllocator();
    allocator.reserve('key1', ['First', 'Second']);
    const name = allocator.reserve('key2', ['First', 'Second']);
    assert.equal(name, 'Second');
  });
});
