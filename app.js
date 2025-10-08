const STORAGE_KEY = 'localContactsDB';
const form = document.getElementById('contact-form');
const contactListDiv = document.getElementById('contact-list');
const submitBtn = document.getElementById('submit-btn');
const clearFormBtn = document.getElementById('clear-form-btn');
const contactIdInput = document.getElementById('contact-id');

// --- "JSON" Database Layer (using localStorage) ---

// CREATE/READ: Get contacts from localStorage or initialize an empty array
function getContacts() {
    const contactsString = localStorage.getItem(STORAGE_KEY);
    // JSON.parse converts the JSON string back to a JavaScript object/array
    return contactsString ? JSON.parse(contactsString) : [];
}

// UPDATE: Save the entire contacts array back to localStorage
function saveContacts(contacts) {
    // JSON.stringify converts the JavaScript object/array to a JSON string
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
}

// --- RESTful Operations (CRUD) ---

// CREATE/UPDATE
function saveContact(name, phone, email, id = null) {
    const contacts = getContacts();
    if (id) {
        // UPDATE
        const index = contacts.findIndex(c => c.id == id);
        if (index !== -1) {
            contacts[index] = { id: id, name, phone, email };
        }
    } else {
        // CREATE
        const newId = Date.now(); // Simple unique ID
        contacts.push({ id: newId, name, phone, email });
    }
    saveContacts(contacts);
    renderContacts();
    form.reset();
    resetFormState();
}

// DELETE
function deleteContact(id) {
    let contacts = getContacts();
    contacts = contacts.filter(c => c.id != id);
    saveContacts(contacts);
    renderContacts();
}

// READ (Render All)
function renderContacts() {
    const contacts = getContacts();
    contactListDiv.innerHTML = ''; // Clear existing list

    if (contacts.length === 0) {
        contactListDiv.innerHTML = '<p>No contacts found.</p>';
        return;
    }

    contacts.forEach(contact => {
        const div = document.createElement('div');
        div.innerHTML = `
            <strong>${contact.name}</strong> (${contact.phone}, ${contact.email})
            <button onclick="editContact('${contact.id}')">Edit</button>
            <button onclick="deleteContact('${contact.id}')">Delete</button>
        `;
        contactListDiv.appendChild(div);
    });
}

// Additional function for editing (pre-populates the form)
function editContact(id) {
    const contacts = getContacts();
    const contact = contacts.find(c => c.id == id);

    if (contact) {
        document.getElementById('name').value = contact.name;
        document.getElementById('phone').value = contact.phone;
        document.getElementById('email').value = contact.email;
        contactIdInput.value = contact.id;
        submitBtn.textContent = 'Update Contact';
    }
}

function resetFormState() {
    contactIdInput.value = '';
    submitBtn.textContent = 'Add Contact';
    form.reset();
}

// --- Event Listeners ---

form.addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const phone = document.getElementById('phone').value;
    const email = document.getElementById('email').value;
    const id = contactIdInput.value || null;

    saveContact(name, phone, email, id);
});

clearFormBtn.addEventListener('click', resetFormState);

// Initial load
document.addEventListener('DOMContentLoaded', renderContacts);
