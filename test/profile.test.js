const test = require('node:test');
const assert = require('node:assert/strict');
const { getProfileValues, validateProfile } = require('../src/profile');

test('getProfileValues prellena el formulario y usa vacios para metadatos ausentes', () => {
  assert.deepEqual(getProfileValues({
    document_type: 'CC',
    document_number: '123456',
    address: 'Calle 10',
  }), {
    document_type: 'CC',
    document_number: '123456',
    address: 'Calle 10',
    phone: '',
  });
  assert.deepEqual(getProfileValues(), {
    document_type: '',
    document_number: '',
    address: '',
    phone: '',
  });
  assert.deepEqual(getProfileValues(null), {
    document_type: '',
    document_number: '',
    address: '',
    phone: '',
  });
});

test('validateProfile acepta datos validos y recorta espacios', () => {
  const result = validateProfile({
    document_type: 'CC',
    document_number: ' 123456 ',
    address: ' Calle 10 # 20-30 ',
    phone: '+57 300 123 4567',
  });

  assert.deepEqual(result.errors, {});
  assert.equal(result.values.document_number, '123456');
  assert.equal(result.values.address, 'Calle 10 # 20-30');
});

test('validateProfile rechaza valores invalidos y campos faltantes', () => {
  const result = validateProfile({
    document_type: 'otro',
    document_number: '<script>',
    address: 'x',
    phone: 'sin telefono',
  });

  assert.deepEqual(Object.keys(result.errors).sort(), [
    'address',
    'document_number',
    'document_type',
    'phone',
  ]);
});
