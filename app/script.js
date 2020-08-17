const { dialog } = require("electron").remote;
const { ipcRenderer } = require("electron");
const path = require("path");
const os = require("os");
let qualityValue = parseInt("50");
let outputPath = path.join(os.homedir(), "Desktop", "ImageZipper");
let openDestination = false;

function browseImages() {
  dialog
    .showOpenDialog({
      title: "Select Images",
      properties: ["openFile", "multiSelections"],
      filters: [
        {
          name: "Images",
          extensions: ["jpg", "png", "gif", "svg"],
        },
      ],
    })
    .then((result) => {
      if (!result.canceled && result.filePaths.length) {
        let images = [];
        for (let file of result.filePaths) {
          images.push(file);
        }
        compressImage(images);
        return false;
      }
    })
    .catch((err) => {
      console.error(err);
    });
}

function compressImage(images) {
  ipcRenderer.send("image:minimize", {
    images,
    outputPath,
    qualityValue,
    openDestination,
  });
}

function createLog(log) {
  document.getElementById("logDiv").classList.remove("is-hidden");
  let list = document.getElementById("outputLog");
  list.classList.add("bd-light");
  let item = document.createElement("li");
  let span = document.createElement("span");
  if (log.type === "error") {
    span.classList.add("text-error");
  }
  span.appendChild(document.createTextNode(log.message));
  item.appendChild(span);
  list.appendChild(item);
}

(function () {
  ipcRenderer.on("browse:images", (e) => {
    browseImages();
  });
  ipcRenderer.on("output:log", (e, log) => {
    createLog(log);
  });
  document.getElementById("showAbout").addEventListener("click", (e) => {
    e.preventDefault();
    ipcRenderer.send("show:about");
  });
  document
    .getElementById("openDestination")
    .addEventListener("change", (e) => {
      openDestination = e.target.value ? true : false;
    });
  const dropZone = document.getElementById("dropZone");
  dropZone.addEventListener("click", (e) => {
    e.preventDefault();
    browseImages();
  });
  dropZone.ondragover = () => {
    return false;
  };
  dropZone.ondragleave = () => {
    return false;
  };
  dropZone.ondragend = () => {
    return false;
  };
  dropZone.ondrop = (e) => {
    e.preventDefault();
    let images = [];
    for (let f of e.dataTransfer.files) {
      images.push(f.path);
    }
    compressImage(images);
    return false;
  };

  const qualityPlaceHolder = document.getElementById(
    "qualityPlaceHolder"
  );

  document
    .getElementById("outputQuality")
    .addEventListener("change", (e) => {
      e.preventDefault();
      qualityPlaceHolder.innerText = `(${e.target.value}%)`;
      qualityValue = parseInt(e.target.value);
    });

  const pathInput = document.getElementById("pathInput");
  pathInput.value = outputPath;
  pathInput.addEventListener("click", (e) => {
    e.preventDefault();
    dialog
      .showOpenDialog({
        title: "Set Output Path",
        properties: [
          "openDirectory",
          "createDirectory",
          "promptToCreate",
        ],
      })
      .then((result) => {
        if (!result.canceled && result.filePaths.length) {
          outputPath = result.filePaths[0];
          pathInput.value = result.filePaths[0];
        }
      })
      .catch((err) => {
        console.error(err);
      });
  });
})();
