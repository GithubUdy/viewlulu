import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const PYTHON_BASE_URL = process.env.PY_AI_BASE_URL || 'http://localhost:8000';

export const requestGroupSearch = async ({
  imagePath,
  groups,
}: {
  imagePath: string;
  groups: Record<string, string[]>;
}) => {
  const form = new FormData();

  form.append('file', fs.createReadStream(imagePath));
  form.append('groups', JSON.stringify(groups));

  const res = await axios.post(
    `${PYTHON_BASE_URL}/pouch/group-search`,
    form,
    {
      headers: form.getHeaders(),
      timeout: 30_000,
    }
  );

  return res.data;
};
