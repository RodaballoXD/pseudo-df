
// --------------------------------------------------------
// PROCESS FUNCTION
// --------------------------------------------------------
let inputs = [];

function createInputBox() {
    const container = document.getElementById("inputs-container");

    const box = document.createElement("textarea");
    box.placeholder = "Enter NBT data";

    container.appendChild(box);
    inputs.push(box);

    box.addEventListener("input", () => {
        const isLast = inputs[inputs.length - 1] === box;
        const hasText = box.value.trim().length > 0;
        if (isLast && hasText) {
            createInputBox();
            return;
        }

        const index = inputs.indexOf(box);
        const nextBox = inputs[index + 1];
        const nextEmpty = nextBox.value.length === 0;
        if (!hasText && !isLast && nextEmpty) {
            removeInputBox(nextBox);
        }
    });
}

function removeInputBox(box) {
    const index = inputs.indexOf(box);
    inputs.splice(index, 1);
    box.remove();
}

createInputBox();