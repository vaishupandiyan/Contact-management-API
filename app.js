// app.js - linked from index.html
(() => {
  const STORAGE_KEY = 'contacts_v1';
  let contacts = [];

  // DOM refs
  const contactForm = document.getElementById('contactForm');
  const contactIdInput = document.getElementById('contactId');
  const nameInput = document.getElementById('name');
  const phoneInput = document.getElementById('phone');
  const emailInput = document.getElementById('email');
  const companyInput = document.getElementById('company');
  const saveBtn = document.getElementById('saveBtn');
  const resetBtn = document.getElementById('resetBtn');
  const contactsTbody = document.getElementById('contactsTbody');
  const countDisplay = document.getElementById('countDisplay');

  const searchInput = document.getElementById('searchInput');
  const clearSearch = document.getElementById('clearSearch');

  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const importFile = document.getElementById('importFile');
  const clearAllBtn = document.getElementById('clearAllBtn');

  // utils
  function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
  }

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      contacts = raw ? JSON.parse(raw) : [];
    } catch (e) {
      contacts = [];
      console.error('Failed to parse contacts from storage', e);
    }
  }

  function uid() {
    // simple unique id
    return 'c_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,8);
  }

  function sanitize(s) {
    return String(s ?? '').trim();
  }

  // rendering
  function render(filter = '') {
    const q = sanitize(filter).toLowerCase();
    contactsTbody.innerHTML = '';

    const list = contacts
      .slice()
      .sort((a,b) => a.name.localeCompare(b.name))
      .filter(c => {
        if (!q) return true;
        return (c.name + ' ' + (c.phone||'') + ' ' + (c.email||'') + ' ' + (c.company||''))
          .toLowerCase()
          .includes(q);
      });

    for (const c of list) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${escapeHtml(c.name)}</strong></td>
        <td>${escapeHtml(c.phone)}</td>
        <td>${escapeHtml(c.email || '')}</td>
        <td>${escapeHtml(c.company || '')}</td>
        <td class="actions">
          <button data-action="edit" data-id="${c.id}" class="small">Edit</button>
          <button data-action="delete" data-id="${c.id}" class="small">Delete</button>
        </td>
      `;
      contactsTbody.appendChild(tr);
    }

    countDisplay.textContent = `${list.length} contact${list.length !== 1 ? 's' : ''}`;
  }

  function escapeHtml(text) {
    return text
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }

  // form actions
  function resetForm() {
    contactIdInput.value = '';
    contactForm.reset();
    saveBtn.textContent = 'Save Contact';
  }

  function validateForm() {
    const name = sanitize(nameInput.value);
    const phone = sanitize(phoneInput.value);
    if (!name) throw new Error('Name is required.');
    if (!phone) throw new Error('Phone is required.');
    // basic phone validation (loose)
    if (phone.length < 6) throw new Error('Phone number seems too short.');
    return { name, phone, email: sanitize(emailInput.value), company: sanitize(companyInput.value) };
  }

  function addContact(data) {
    const newContact = {
      id: uid(),
      createdAt: new Date().toISOString(),
      ...data
    };
    contacts.push(newContact);
    saveToStorage();
    render(searchInput.value);
    resetForm();
  }

  function updateContact(id, data) {
    const idx = contacts.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Contact not found.');
    contacts[idx] = { ...contacts[idx], ...data, updatedAt: new Date().toISOString() };
    saveToStorage();
    render(searchInput.value);
    resetForm();
  }

  function deleteContact(id) {
    if (!confirm('Delete this contact?')) return;
    contacts = contacts.filter(c => c.id !== id);
    saveToStorage();
    render(searchInput.value);
  }

  function editContact(id) {
    const c = contacts.find(x => x.id === id);
    if (!c) return alert('Contact not found');
    contactIdInput.value = c.id;
    nameInput.value = c.name;
    phoneInput.value = c.phone;
    emailInput.value = c.email || '';
    companyInput.value = c.company || '';
    saveBtn.textContent = 'Update Contact';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // event listeners
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    try {
      const data = validateForm();
      const id = contactIdInput.value;
      if (id) {
        updateContact(id, data);
      } else {
        addContact(data);
      }
    } catch (err) {
      alert(err.message || 'Validation failed');
    }
  });

  resetBtn.addEventListener('click', (e) => {
    e.preventDefault();
    resetForm();
  });

  contactsTbody.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if (action === 'edit') editContact(id);
    if (action === 'delete') deleteContact(id);
  });

  searchInput.addEventListener('input', () => render(searchInput.value));
  clearSearch.addEventListener('click', () => { searchInput.value = ''; render(''); });

  // export / import
  exportBtn.addEventListener('click', () => {
    const dataStr = JSON.stringify(contacts, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contacts-${(new Date()).toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  importBtn.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', async (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    if (!confirm('Importing will append contacts from the file. Duplicate detection is naive (by phone). Continue?')) {
      importFile.value = '';
      return;
    }
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error('JSON must be an array of contacts.');
      // simple merge: if phone exists, skip
      const existingPhones = new Set(contacts.map(c => c.phone));
      let added = 0;
      for (const item of parsed) {
        const name = sanitize(item.name || item.fullName || '');
        const phone = sanitize(item.phone || item.mobile || '');
        if (!name || !phone) continue;
        if (existingPhones.has(phone)) continue;
        contacts.push({
          id: uid(),
          createdAt: new Date().toISOString(),
          name, phone,
          email: sanitize(item.email || ''),
          company: sanitize(item.company || item.note || '')
        });
        existingPhones.add(phone);
        added++;
      }
      saveToStorage();
      render(searchInput.value);
      alert(`Imported ${added} new contact${added !== 1 ? 's' : ''}.`);
    } catch (err) {
      alert('Import failed: ' + (err.message || err));
    } finally {
      importFile.value = '';
    }
  });

  clearAllBtn.addEventListener('click', () => {
    if (!confirm('This will permanently delete ALL contacts from this browser. Continue?')) return;
    contacts = [];
    saveToStorage();
    render();
  });

  // init
  loadFromStorage();
  render();

})();
