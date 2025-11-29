fetch("tags.json")
    .then(r => r.json())
    .then(json => {
        window.TAGS_FILE = json;
        console.log("TAGS_FILE loaded:", TAGS_FILE);
        processBtn.disabled = false;
    })
    .catch(err => console.error("Error loading tags.json:", err));