/***** Firebase Initialization *****/
const firebaseConfig = {
    apiKey: "AIzaSyClzEsMA1Z0L1Y8mwT6rjsBWvhCRDT8ICs",
    authDomain: "familytreeproject-72a87.firebaseapp.com",
    projectId: "familytreeproject-72a87",
    storageBucket: "familytreeproject-72a87.firebasestorage.app",
    messagingSenderId: "64905770238",
    appId: "1:64905770238:web:e72f7126326f8dd33e61af",
    measurementId: "G-CJ3HC2S16D"
  };
  
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  
  // Get Firestore and Storage references
  const db = firebase.firestore();
  const storage = firebase.storage();
  
  /***** DOM Elements *****/
  const addMemberBtn = document.getElementById('addMemberBtn');
  const treeContainer = document.getElementById('treeContainer');
  const memberModal = document.getElementById('memberModal');
  const closeModalBtn = document.getElementById('closeModal');
  
  const memberForm = document.getElementById('memberForm');
  const memberIdField = document.getElementById('memberId');
  const memberNameField = document.getElementById('memberName');
  const memberDescriptionField = document.getElementById('memberDescription');
  const memberParentField = document.getElementById('memberParent');
  const memberImageField = document.getElementById('memberImage');
  const modalTitle = document.getElementById('modalTitle');
  
  /***** Event Listeners *****/
  addMemberBtn.addEventListener('click', () => {
    openModalForNew();
  });
  
  closeModalBtn.addEventListener('click', () => {
    memberModal.style.display = 'none';
  });
  
  /** Submit form to save data (create or update) **/
  memberForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveMember();
  });
  
  /***** Functions *****/
  
  /** Open modal for creating a new member **/
  function openModalForNew() {
    modalTitle.innerText = 'Add New Member';
    memberIdField.value = '';  // empty -> indicates new
    memberNameField.value = '';
    memberDescriptionField.value = '';
    memberParentField.value = '';
    memberImageField.value = null;
    populateParentOptions();   // get the latest members in dropdown
    memberModal.style.display = 'block';
  }
  
  /** Open modal for editing an existing member **/
  function openModalForEdit(member) {
    modalTitle.innerText = 'Edit Member';
    memberIdField.value = member.id;
    memberNameField.value = member.data().name;
    memberDescriptionField.value = member.data().description || '';
    populateParentOptions(member.data().parentId);
    memberImageField.value = null; // We won't show the existing image path
    memberModal.style.display = 'block';
  }
  
  /** Populate the "Parent" dropdown with existing members **/
  async function populateParentOptions(selectedParentId = '') {
    memberParentField.innerHTML = '<option value="">(No parent)</option>';
  
    const snapshot = await db.collection('members').get();
    snapshot.forEach(doc => {
      const opt = document.createElement('option');
      opt.value = doc.id;
      opt.textContent = doc.data().name;
      if (doc.id === selectedParentId) {
        opt.selected = true;
      }
      memberParentField.appendChild(opt);
    });
  }
  
  /** Save a member to Firestore (new or existing) **/
  async function saveMember() {
    const id = memberIdField.value;
    const name = memberNameField.value.trim();
    const description = memberDescriptionField.value.trim();
    const parentId = memberParentField.value || null;
    const file = memberImageField.files[0];
  
    let imageUrl = null;
  
    // 1. If there's a file, upload to Firebase Storage
    if (file) {
      const storageRef = storage.ref('profileImages/' + Date.now() + '_' + file.name);
      await storageRef.put(file);
      imageUrl = await storageRef.getDownloadURL();
    }
  
    // 2. If editing existing, fetch old data to keep old image if no new file
    if (id) {
      const existingDoc = await db.collection('members').doc(id).get();
      if (!imageUrl) {
        imageUrl = existingDoc.data().imageUrl || null;
      }
  
      // 3. Update the document
      await db.collection('members').doc(id).update({
        name,
        description,
        parentId,
        imageUrl
      });
    } else {
      // 3. Create a new document
      await db.collection('members').add({
        name,
        description,
        parentId,
        imageUrl
      });
    }
  
    // Close modal & refresh UI
    memberModal.style.display = 'none';
    renderTree();
  }
  
  /** Render the tree by fetching all members from Firestore **/
  async function renderTree() {
    treeContainer.innerHTML = '';
  
    const snapshot = await db.collection('members').get();
    const members = [];
    snapshot.forEach(doc => {
      members.push({ id: doc.id, ...doc.data() });
    });
  
    // Create the visual cards
    members.forEach(member => {
      const card = document.createElement('div');
      card.className = 'member-card';
      card.addEventListener('click', (e) => {
        // Prevent click if user is editing something
        // Otherwise, open editor
        openModalForEdit({ id: member.id, data: () => member });
      });
  
      // Image
      const img = document.createElement('img');
      img.className = 'member-image';
      img.src = member.imageUrl || 'https://via.placeholder.com/220x180?text=No+Image';
      card.appendChild(img);
  
      // Info
      const info = document.createElement('div');
      info.className = 'member-info';
  
      const title = document.createElement('h3');
      title.innerText = member.name;
      info.appendChild(title);
  
      const desc = document.createElement('p');
      desc.innerText = member.description || '';
      info.appendChild(desc);
  
      card.appendChild(info);
  
      treeContainer.appendChild(card);
    });
  }
  
  /** Initialize the tree on page load **/
  window.onload = async () => {
    renderTree();
  };
  