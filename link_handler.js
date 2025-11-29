function showCopiedToast(text, time=1200) {
    const toast = document.createElement("div");
    toast.textContent = text;
    toast.style.position = "fixed";
    toast.style.top = "20px";
    toast.style.right = "20px";
    toast.style.background = "rgba(0,0,0,0.8)";
    toast.style.color = "#fff";
    toast.style.padding = "10px 15px";
    toast.style.borderRadius = "6px";
    toast.style.fontSize = "14px";
    toast.style.zIndex = "9999";
    toast.style.opacity = "1";
    toast.style.transition = "opacity .5s ease";

    document.body.appendChild(toast);

    setTimeout(() => { toast.style.opacity = 0; }, time);
    setTimeout(() => { toast.remove(); }, time+500);
}

async function shareAndCopy() {
    const code = editor.getValue();
    const compressed = pako.gzip(code);
    const b64 = btoa(String.fromCharCode(...compressed));
    const url = location.origin + location.pathname + "#code=" + b64;
    try {
        await navigator.clipboard.writeText(url);
        showCopiedToast("Link copied to clipboard");
    } catch (err) {
        console.error("Clipboard error:", err);
        alert("Couldn't copy to clipboard. Check console for more info");
    }
}

function loadSharedCode() {
    if (!location.hash.startsWith("#code=")) return;

    const b64 = location.hash.slice(6);

    try {
        const compressed = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        const text = pako.ungzip(compressed, { to: "string" });
        editor.setValue(text);
        showCopiedToast("Succesfully loaded code", 2000);
    } catch (err) {
        console.error("Error decoding shared code:", err);
        showCopiedToast("Error loading code. Check console for more info", 4000);
    }
}
window.addEventListener("load", loadSharedCode);