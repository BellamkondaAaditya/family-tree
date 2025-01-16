/************************** 
  Data & Initialization 
**************************/
let familyTree;
let familyData = []; // Will load from localStorage if it exists

// Key used in localStorage
const STORAGE_KEY = "familyTreeData";

// On page load
document.addEventListener("DOMContentLoaded", () => {
  // Load data from localStorage
  const storedData = localStorage.getItem(STORAGE_KEY);
  if (storedData) {
    familyData = JSON.parse(storedData);
  }

  // Initialize the FamilyTreeJS
  initFamilyTree();

  // Setup event listeners
  document.getElementById("addRootBtn").addEventListener("click", () => {
    openAddModal(null);
    print('hello')
  });
  document.getElementById("closeModal").addEventListener("click", closePersonModal);
  document.getElementById("personForm").addEventListener("submit", onPersonFormSubmit);

  // Delete modal
  document.getElementById("cancelDeleteBtn").addEventListener("click", () => {
    document.getElementById("deleteModal").style.display = "none";
  });
  document.getElementById("confirmDeleteBtn").addEventListener("click", confirmDelete);
});

/************************** 
  FamilyTreeJS Setup 
**************************/
function initFamilyTree() {
  familyTree = new FamilyTree(document.getElementById("tree"), {
    nodes: familyData,
    nodeBinding: {
      field_0: "name",
      field_1: "title",
      img_0: "img"
    },
    // Customize styling if you wish
    template: "hannah",
    enableSearch: false, // We can enable later if needed
    // On click a node, we open an edit/delete dialog
    clickNode: function (args) {
      openEditOrDeleteModal(args.node);
    }
  });
}

/************************** 
  Add / Edit Person 
**************************/
// Called when user clicks "+ Add New Root" or selects "Add Child" somewhere
function openAddModal(parentId) {
  // Clear form
  document.getElementById("personForm").reset();
  document.getElementById("editId").value = ""; // Means new person
  document.getElementById("modalTitle").innerText = "Add Person";

  // Populate the parent dropdown
  populateParentDropdown(parentId);

  // Show modal
  document.getElementById("personModal").style.display = "block";
}

// Called when user clicks on a node to edit or delete
function openEditOrDeleteModal(nodeData) {
  // Show a small modal? We’ll skip the typical “two-step” approach. 
  // Instead, we’ll just open the Add/Edit modal with the data pre-filled,
  // and at the same time we can show a "Delete" button (but let's do a separate flow for clarity).

  // Actually, let's open an immediate confirm: "Edit or Delete?"
  // For clarity, let's just open the Edit form first. The user can also click Delete from there.
  openEditModal(nodeData);
}

// Fill the edit form with node data
function openEditModal(nodeData) {
  document.getElementById("modalTitle").innerText = "Edit Person";
  document.getElementById("editId").value = nodeData.id;
  document.getElementById("name").value = nodeData.name || "";
  document.getElementById("title").value = nodeData.title || "";

  // Populate the parent dropdown, select the current parent
  populateParentDropdown(nodeData.pid || null);

  // Show the modal
  document.getElementById("personModal").style.display = "block";
}

// Fill the "Parent" <select> with all existing nodes (plus "None" for root)
function populateParentDropdown(selectedParentId) {
  const parentSelect = document.getElementById("parent");
  parentSelect.innerHTML = "";

  // Option for no parent (root)
  const noParentOption = document.createElement("option");
  noParentOption.value = "";
  noParentOption.textContent = "(No parent - root)";
  parentSelect.appendChild(noParentOption);

  // For each node, create an option
  familyData.forEach(node => {
    const opt = document.createElement("option");
    opt.value = node.id;
    opt.textContent = node.name;
    if (node.id == selectedParentId) {
      opt.selected = true;
    }
    parentSelect.appendChild(opt);
  });
}

// When user saves the form
function onPersonFormSubmit(e) {
  e.preventDefault();
  const editId = document.getElementById("editId").value;
  const name = document.getElementById("name").value.trim();
  const title = document.getElementById("title").value.trim();
  const parent = document.getElementById("parent").value; // might be empty
  const fileInput = document.getElementById("imageInput");

  // If there's a file, let's convert it to base64
  if (fileInput.files && fileInput.files[0]) {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64Image = evt.target.result; // This is "data:image/...;base64,..."
      saveNode(editId, name, title, parent, base64Image);
    };
    reader.readAsDataURL(fileInput.files[0]);
  } else {
    // No new image, let's see if we keep the old image or set null
    // We'll handle that in saveNode
    saveNode(editId, name, title, parent, null);
  }
}

function saveNode(editId, name, title, parent, base64Image) {
  if (!editId) {
    // We are adding a new node
    const newId = generateUniqueId();
    const newNode = {
      id: newId,
      name,
      title
    };
    if (parent) newNode.pid = parent;
    if (base64Image) newNode.img = base64Image;

    familyData.push(newNode);
  } else {
    // We are editing an existing node
    const nodeIndex = familyData.findIndex(n => n.id == editId);
    if (nodeIndex >= 0) {
      familyData[nodeIndex].name = name;
      familyData[nodeIndex].title = title;
      // If parent is empty => remove pid so it becomes root
      if (parent) {
        familyData[nodeIndex].pid = parent;
      } else {
        delete familyData[nodeIndex].pid;
      }
      // If user uploaded new image
      if (base64Image) {
        familyData[nodeIndex].img = base64Image;
      }
    }
  }

  // Persist changes
  updateLocalStorage();
  // Re-init the tree
  refreshTree();

  closePersonModal();
}

/************************** 
  Delete Person 
**************************/
// We’ll open a confirm modal from the editing function 
function openDeleteModal(nodeId) {
  const person = familyData.find(n => n.id == nodeId);
  if (!person) return;

  // Show the name in the confirm
  document.getElementById("deleteName").innerText = person.name;
  document.getElementById("confirmDeleteBtn").setAttribute("data-delete-id", nodeId);
  document.getElementById("deleteModal").style.display = "block";
}

// Called from the confirm delete button
function confirmDelete() {
  const nodeId = document.getElementById("confirmDeleteBtn").getAttribute("data-delete-id");
  if (!nodeId) return;

  // 1. Remove the node from the array
  familyData = familyData.filter(n => n.id != nodeId);

  // 2. Also remove anyone who had this person as a parent
  // (Depending on your preference, you might set them to root or remove them entirely.)
  // For simplicity, let's set them to root:
  familyData.forEach(n => {
    if (n.pid == nodeId) {
      delete n.pid;
    }
  });

  // 3. Save & refresh
  updateLocalStorage();
  refreshTree();

  // Close the modal
  document.getElementById("deleteModal").style.display = "none";
}

/************************** 
  Helper Functions 
**************************/
// Re-initialize the FamilyTreeJS with updated data
function refreshTree() {
  // Destroy the old instance
  document.getElementById("tree").innerHTML = "";
  familyTree = null;
  initFamilyTree();
}

// Persist data in localStorage
function updateLocalStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(familyData));
}

// Generate a unique ID (naive approach)
function generateUniqueId() {
  return "_" + Math.random().toString(36).substr(2, 9);
}

// Close the Add/Edit modal
function closePersonModal() {
  document.getElementById("personModal").style.display = "none";
}

// For demonstration, let’s add a "Delete" button inside the edit modal
// We can do this by hooking into after we open the modal:
document.addEventListener("click", (evt) => {
  if (evt.target.classList.contains("close")) {
    closePersonModal();
  }
});

// Patch: Add a "Delete" button in the bottom of the form when editing:
document.getElementById("personForm").addEventListener("keydown", function(e) {
  // If user is editing, we want a "Delete" button at the bottom
  // We'll do it after the form is appended, but let's do it simpler:
  // Actually let's just do a single approach: if "editId" is present, show a "Delete" button
});
document.getElementById("personForm").addEventListener("input", function(e) {
  injectDeleteButtonIfEditing();
});

function injectDeleteButtonIfEditing() {
  const editId = document.getElementById("editId").value;
  let deleteBtn = document.getElementById("inlineDeleteBtn");
  
  // If not editing (no editId), hide the delete button
  if (!editId) {
    if (deleteBtn) {
      deleteBtn.remove();
    }
    return;
  }

  // If editing and there's no delete button, create one
  if (editId && !deleteBtn) {
    deleteBtn = document.createElement("button");
    deleteBtn.id = "inlineDeleteBtn";
    deleteBtn.type = "button";
    deleteBtn.classList.add("danger");
    deleteBtn.style.marginTop = "1rem";
    deleteBtn.style.backgroundColor = "#f44336";
    deleteBtn.style.color = "#fff";
    deleteBtn.style.border = "none";
    deleteBtn.style.padding = "0.7rem";
    deleteBtn.style.cursor = "pointer";
    deleteBtn.style.borderRadius = "4px";
    deleteBtn.innerText = "Delete This Person";

    // On click, open the delete modal
    deleteBtn.addEventListener("click", () => {
      openDeleteModal(editId);
    });

    // Insert into the form
    document.getElementById("personForm").appendChild(deleteBtn);
  }
}
