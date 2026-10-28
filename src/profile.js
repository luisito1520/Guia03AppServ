const DOCUMENT_TYPES = [
  { value: 'CC', label: 'Cedula de ciudadania' },
  { value: 'TI', label: 'Tarjeta de identidad' },
  { value: 'CE', label: 'Cedula de extranjeria' },
  { value: 'PASSPORT', label: 'Pasaporte' },
  { value: 'PPT', label: 'Permiso por proteccion temporal' },
];

const DOCUMENT_TYPE_VALUES = new Set(DOCUMENT_TYPES.map(({ value }) => value));

function getString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function getProfileValues(metadata = {}) {
  const source = metadata && typeof metadata === 'object' ? metadata : {};
  return {
    document_type: getString(source.document_type),
    document_number: getString(source.document_number),
    address: getString(source.address),
    phone: getString(source.phone),
  };
}

function validateProfile(input = {}) {
  const values = {
    document_type: getString(input.document_type),
    document_number: getString(input.document_number),
    address: getString(input.address),
    phone: getString(input.phone),
  };
  const errors = {};

  if (!DOCUMENT_TYPE_VALUES.has(values.document_type)) {
    errors.document_type = 'Selecciona un tipo de documento valido.';
  }
  if (!/^[a-zA-Z0-9.-]{3,30}$/.test(values.document_number)) {
    errors.document_number = 'Usa entre 3 y 30 letras, numeros, puntos o guiones.';
  }
  if (values.address.length < 5 || values.address.length > 200) {
    errors.address = 'La direccion debe tener entre 5 y 200 caracteres.';
  }
  if (!/^[+0-9() .-]{7,25}$/.test(values.phone)) {
    errors.phone = 'Ingresa un telefono de 7 a 25 caracteres usando numeros y signos comunes.';
  }

  return { values, errors };
}

module.exports = { DOCUMENT_TYPES, getProfileValues, validateProfile };
