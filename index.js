const express = require('express');
const { google } = require('googleapis');
const axios = require('axios');

const app = express();
app.use(express.json());

// Auth with Google
const auth = new google.auth.GoogleAuth({
  keyFile: 'service-account.json', // You will provide this securely in Render
  scopes: ['https://www.googleapis.com/auth/drive']
});
const drive = google.drive({ version: 'v3', auth });

app.post('/upload', async (req, res) => {
  const { file_url, folder_id, file_name } = req.body;
  if (!file_url || !folder_id || !file_name) {
    return res.status(400).json({ error: 'Missing file_url, folder_id, or file_name' });
  }

  try {
    // Download file stream
    const response = await axios({
      method: 'GET',
      url: file_url,
      responseType: 'stream'
    });

    // Upload to Drive
    const fileMetadata = {
      name: file_name,
      parents: [folder_id]
    };
    const media = {
      body: response.data
    };

    const file = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id'
    });

    // Make public
    await drive.permissions.create({
      fileId: file.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });

    const downloadLink = `https://drive.google.com/uc?id=${file.data.id}&export=download`;

    res.json({
      status: 'success',
      drive_file_id: file.data.id,
      direct_download_link: downloadLink
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      error: 'Upload failed',
      details: err.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Uploader API running on port ${PORT}`));
