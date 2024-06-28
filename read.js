require('dotenv').config();
const express = require('express');
const Imap = require('imap-simple');
const { simpleParser } = require('mailparser');
const _ = require('lodash');
const app = express();
const port = 4000;

const config = {
  imap: {
    user: process.env.EMAIL,
    password: process.env.PASSWORD,
    host: 'imap.qq.com',
    port: 993,
    tls: true,
    authTimeout: 3000
  }
};

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/Reader.html');
});

app.get('/emails', async (req, res) => {
  try {
    console.log('Connecting to IMAP server...');
    const connection = await Imap.connect(config);
    await connection.openBox('INBOX');
    console.log('Connected and INBOX opened.');

    const searchCriteria = ['ALL'];
    const fetchOptions = {
      bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)', 'TEXT'],
      struct: true
    };

    console.log('Searching for emails...');
    const messages = await connection.search(searchCriteria, fetchOptions);
    console.log('Emails found:', messages.length);

    const emails = messages.map(item => {
      const header = _.find(item.parts, { "which": "HEADER.FIELDS (FROM TO SUBJECT DATE)" });
      const id = item.attributes.uid;
      return {
        id: id,
        from: header && header.body.from ? header.body.from[0] : 'Unknown',
        subject: header && header.body.subject ? header.body.subject[0] : '(No Subject)',
        date: header && header.body.date ? new Date(header.body.date[0]) : new Date(0)
      };
    });

    // Sort emails by date in descending order
    emails.sort((a, b) => b.date - a.date);

    res.json(emails);
  } catch (err) {
    console.error('Error fetching emails:', err.message);
    res.status(500).send(err.message);
  }
});

app.get('/email/:id', async (req, res) => {
  try {
    const emailId = req.params.id;
    const connection = await Imap.connect(config);
    await connection.openBox('INBOX');

    const searchCriteria = [['UID', emailId]];
    const fetchOptions = { bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)', 'TEXT'], struct: true };

    const messages = await connection.search(searchCriteria, fetchOptions);

    if (messages.length === 0) {
      return res.status(404).send('Email not found');
    }

    const textPart = _.find(messages[0].parts, { "which": "TEXT" });
    const header = _.find(messages[0].parts, { "which": "HEADER.FIELDS (FROM TO SUBJECT DATE)" });

    let text = '';
    if (textPart.encoding && textPart.encoding.toLowerCase() === 'base64') {
      text = Buffer.from(textPart.body, 'base64').toString('utf-8');
    } else {
      text = textPart.body;
    }

    const parsed = await simpleParser(textPart.body);

    res.json({
      from: header && header.body.from ? header.body.from[0] : 'Unknown',
      subject: header && header.body.subject ? header.body.subject[0] : '(No Subject)',
      date: header && header.body.date ? new Date(header.body.date[0]).toLocaleString() : 'Invalid Date',
      text: text || '(No Text)',
      html: parsed.html || '(No HTML)'
    });
  } catch (err) {
    console.error('Error fetching email:', err.message);
    res.status(500).send(err.message);
  }
});
app.delete('/email/:id', async (req, res) => {
  try {
    const emailId = req.params.id;
    const connection = await Imap.connect(config);
    await connection.openBox('INBOX');
    console.log(`Connected and INBOX opened for deleting email with ID: ${emailId}`);

    await connection.addFlags(emailId, '\\Deleted');
    console.log(`Email with ID: ${emailId} marked as deleted`);

    await connection.imap.expunge();
    console.log(`Email with ID: ${emailId} expunged`);

    await connection.closeBox(true);
    await connection.end();
    res.send('Email deleted');
  } catch (err) {
    console.error('Error deleting email:', err.message);
    res.status(500).send(err.message);
  }
});


app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});