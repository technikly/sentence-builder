// parseCSV.js

export const parseCSV = (csvText) => {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const rows = lines.slice(1);
  const result = rows.map((line) => {
    const values = line.split(',').map((v) => v.trim());
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || '';
    });
    return obj;
  });
  return result;
};
