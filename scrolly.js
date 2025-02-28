import { StepData } from "./common.js";
import { ScrollyError } from "./common.js";
import { validateStepDataArray } from "./common.js";

import { fetchAllDataFromGoogleSheet } from "./google-sheet.js";

let contentSection = null;
let stickyImageContainer = null;
let stickyMapContainer = null;
let stickyVideoContainer = null;
let steps = null;
let prevStepData = null;

const transitionInMilliseconds = 500;

// scrollama notifies us when a step is entered/scrolled to
let scroller = scrollama();

document.addEventListener("DOMContentLoaded", async function () {
  //createScrollyContentFromCSVFile();
  try {
    const allScrollyData = await fetchAllDataFromGoogleSheet();
    allScrollyData.storyData.validate(
      "Reading Google Sheet story tab (1st sheet)"
    );
    validateStepDataArray(
      allScrollyData.stepData,
      "Reading Google Sheet steps tab (2nd sheet)"
    );
    createAllScrollyContentInHTML(allScrollyData);
  } catch (scrollyError) {
    displayThenThrowError(scrollyError);
  }

  // initialize scrollama after the scrolly content has been created
  initScrollama();
});

function createAllScrollyContentInHTML(allScrollyData) {
  createStoryContentInHtml(allScrollyData.storyData);
  createStepsContentInHtml(allScrollyData.stepData);

  // horizontalPercentage has to be set after Steps are created
  // because that's when the sticky containers (that get their
  // width set) are created
  setHorizontalWidthOfTextAndStickyContent(
    allScrollyData.storyData.textHorizontalPercentage
  );
}

function createStoryContentInHtml(storyData) {
  const storyTitle = document.getElementById("story-title");
  storyTitle.innerHTML = storyData.title;

  const browserTitle = document.getElementById("browser-title");
  browserTitle.innerHTML = storyData.title;

  const subtitle = document.getElementById("subtitle");
  subtitle.innerHTML = storyData.subtitle;

  const endText = document.getElementById("end-text");
  endText.innerHTML = storyData.endText;
}

function setHorizontalWidthOfTextAndStickyContent(horizontalPercentage) {
  if (horizontalPercentage < 99 && horizontalPercentage > 1) {
    // Width is specified as a percentage of the horizontal spacce for the text
    const article = document.querySelector("article");
    article.style.width = `${horizontalPercentage}%`;

    // Sticky content is the remaining horizontal space, but we have to account
    // for each kind of sticky content
    const stickyContent = document.querySelectorAll(".sticky-content");
    stickyContent.forEach((stickyContentDiv) => {
      stickyContentDiv.style.width = `${100 - horizontalPercentage}%`;
    });
  }
}

/* This creates all the steps in HTML for the scrolly story 
    from a stepDataArry 
*/
function createStepsContentInHtml(stepDataArray) {
  var stepNumber = 1;
  var isPrevStepScrolly = false;
  let storySteps = document.createElement("article");
  contentSection = document.querySelector("#content-section");

  let scrollyContainer = createScrollyContainer();

  contentSection.innerHTML = ""; // Clear out the content section

  stepDataArray.forEach((stepData) => {
    if (stepData.contentType === "text") {
      // Text steps are not scrolly, so we have to close our scrolly container
      // and start a new section
      if (isPrevStepScrolly) {
        closeScrollyContainer(scrollyContainer, storySteps);
      }
      // create and add a text container
      contentSection.appendChild(createTextContainer(stepData, stepNumber));
      // start a new scrolly container for subsequent steps
      scrollyContainer = createScrollyContainer();
      storySteps = document.createElement("article");
      isPrevStepScrolly = false;
    } else {
      // Create next step in the scrolly story
      var stepElement = document.createElement("div");
      stepElement.classList.add("step");
      stepElement.dataset.step = stepNumber;
      stepElement.dataset.contentType = stepData.contentType;
      if (stepData.filePath) {
        stepElement.dataset.filePath = stepData.filePath;
      }
      if (stepData.altText) {
        stepElement.dataset.altText = stepData.altText;
      }
      if (stepData.latitude) {
        stepElement.dataset.latitude = stepData.latitude;
      }
      if (stepData.longitude) {
        stepElement.dataset.longitude = stepData.longitude;
      }
      if (stepData.zoomLevel) {
        stepElement.dataset.zoomLevel = stepData.zoomLevel;
      }

      stepElement.innerHTML = `<p class="step-content">${stepData.text}</p>`;
      storySteps.appendChild(stepElement);
      isPrevStepScrolly = true;
    }
    stepNumber++;
  });

  if (isPrevStepScrolly) {
    closeScrollyContainer(scrollyContainer, storySteps);
  }
}

function createTextContainer(stepData, stepNum) {
  let textContainer = document.createElement("div");
  textContainer.classList.add("text-content");
  textContainer.dataset.step = stepNum;
  textContainer.innerHTML = stepData.text;
  return textContainer;
}

function createScrollyContainer() {
  let scrollyContainer = document.createElement("div");
  scrollyContainer.classList.add("scrolly-container");
  return scrollyContainer;
}

function createStickyContainers(uniqueId) {
  let stickyContainer = document.createElement("div");
  stickyContainer.classList.add("sticky-content");
  stickyContainer.classList.add("sticky-container");

  let imageContainer = document.createElement("div");
  imageContainer.classList.add("sticky-image-container");
  imageContainer.innerHTML = `<img>`;

  let mapContainer = document.createElement("div");
  mapContainer.classList.add("sticky-map-container");
  mapContainer.id = "sticky-map-container-" + uniqueId;

  let videoContainer = document.createElement("div");
  videoContainer.classList.add("sticky-video-container");

  stickyContainer.appendChild(imageContainer);
  stickyContainer.appendChild(mapContainer);
  stickyContainer.appendChild(videoContainer);

  return stickyContainer;
}

function closeScrollyContainer(scrollyContainer, storySteps) {
  scrollyContainer.appendChild(storySteps);

  // sticky containers need a unique id, so just grab the first step
  // number, which will be unique to all the scrolly content
  const uniqStickyId = getScrollyConatainerFirstStepNum(scrollyContainer);
  const stickyContainer = createStickyContainers(uniqStickyId);
  scrollyContainer.appendChild(stickyContainer);

  contentSection.appendChild(scrollyContainer);
}

function getScrollyConatainerFirstStepNum(scrollyContainer) {
  return scrollyContainer.querySelector(".step").dataset.step;
}

function displayThenThrowError(stepError) {
  const errorMessage = document.getElementById("error-message");
  errorMessage.innerHTML = stepError.message;

  const errorAction = document.getElementById("error-action");
  errorAction.innerHTML = stepError.action;

  const errorHint = document.getElementById("error-hint");
  if (stepError.hint) {
    errorHint.innerHTML = stepError.hint;
    errorHint.style.display = "block";
  } else {
    errorHint.style.display = "none";
  }

  const errorContainer = document.getElementById("error-container");
  errorContainer.style.display = "flex"; // Show the error container

  // Since stepError a subclass of Error, we want to throw it after
  // we display the error in HTML so that the full stack trace is available
  // to the user in the console
  throw stepError;
}

// scrollama event handlers
function handleStepEnter(response) {
  var stepElement = response.element;

  steps = document.querySelectorAll(".step");
  // Set active step state to is-active and all othe steps not active
  steps.forEach((step) => step.classList.remove("is-active"));
  stepElement.classList.add("is-active");
  console.log("Step " + stepElement.dataset.step + " entered");

  replaceStepStickyContent(stepElement);
}

/* As we enter a step in the story, replace or modify the sticky content
   in HTML based on the step data
*/
function replaceStepStickyContent(stepElement) {
  let stepData = stepElement.dataset;

  // ensure we have the sticky containers associated with the current step
  setCurrentStickyContainers(stepElement);

  // transition to a new container if it's different from previous step
  if (doesRequireStickyTransition(stepData)) {
    transitionToNewStickyContentContainer(stepData.contentType);
  }

  // Replace the content in the sticky container
  if (stepData.contentType === "image") {
    displayStickyImage(stepData);
  } else if (stepData.contentType === "video") {
    displayStickyVideo(stepData);
  } else if (stepData.contentType === "map") {
    displayStickyMap(
      stickyMapContainer.id,
      stepData.latitude,
      stepData.longitude,
      stepData.zoomLevel
    );
    addAltTextToMap(stickyMapContainer, stepData.altText);
  }
  prevStepData = stepData;
}

function doesRequireStickyTransition(stepData) {
  // Transition to a new sticky container if the content type is different
  // or if the step number is not sequential
  return (
    prevStepData == null ||
    prevStepData.contentType != stepData.contentType ||
    parseInt(prevStepData.step) + 1 !== parseInt(stepData.step)
  );
}

function setCurrentStickyContainers(stepElement) {
  // Since there are multiple scrolly containers, find the sticky container
  // that is associated with the current scrolly container

  // Find the scrolly container of the currrent step
  const scrollyContainer = stepElement.closest(".scrolly-container");
  const stickyContainer = scrollyContainer.querySelector(".sticky-container");

  // search for each of the corrsponding sticky containers within this scrolly container
  stickyImageContainer = stickyContainer.querySelector(
    ".sticky-image-container"
  );
  stickyMapContainer = stickyContainer.querySelector(".sticky-map-container");
  stickyVideoContainer = stickyContainer.querySelector(
    ".sticky-video-container"
  );
}

function transitionToNewStickyContentContainer(activateContentType) {
  // Start fading out the old container (just do all of them).
  // We've set up a transition on opacity, so setting it to 0 or 1 will take
  // as long as specified in CSS. We can fade in the new content after that
  stickyMapContainer.style.opacity = 0;
  stickyImageContainer.style.opacity = 0;
  stickyVideoContainer.style.opacity = 0;

  stopPlayingVideo(); // in case video is playing, don't want to hear it after it scrolls off page

  // Fade in the new container after the opacity transition
  setTimeout(() => {
    switch (activateContentType) {
      case "image":
        stickyImageContainer.style.opacity = 1;
        stickyImageContainer.style.display = "flex";
        stickyVideoContainer.style.display = "none";
        stickyMapContainer.style.display = "none";
        break;
      case "map":
        stickyMapContainer.style.opacity = 1;
        stickyMapContainer.style.display = "block";
        stickyImageContainer.style.display = "none";
        stickyVideoContainer.style.display = "none";
        break;
      case "video":
        stickyVideoContainer.style.opacity = 1;
        stickyVideoContainer.style.display = "block";
        stickyImageContainer.style.display = "none";
        stickyMapContainer.style.display = "none";
        break;
    }
  }, transitionInMilliseconds);
}

function displayStickyImage(stepData) {
  let img = stickyImageContainer.querySelector("img");

  // only replace sticky image if it has changed, to avoid flickering
  if (
    !prevStepData ||
    (stepData.filePath && prevStepData.filePath != stepData.filePath)
  ) {
    // Fade out the current image before changing the source
    // Note that this will double the transition when we are switching from
    // an image to a different content type because the containers also fade in/out
    // in that case, but that's ok, a longer transition is appropriate in that case
    img.style.opacity = 0;

    // fade in the image after the opacity transition
    setTimeout(() => {
      // Change the image source
      img.src = stepData.filePath;
      img.alt = stepData.altText;
      img.style.opacity = 1;
    }, transitionInMilliseconds);
  }
  if (stepData.zoomLevel) {
    img.style.transform = `scale(${stepData.zoomLevel})`;
  }
}

function displayStickyVideo(stepData) {
  stickyVideoContainer.innerHTML = `<iframe 
                id="the-iframe-video"
                src="${stepData.filePath}"
                frameborder="0"
                referrerpolicy="strict-origin-when-cross-origin"
                >
            </iframe>`;
  stickyVideoContainer.ariaLabel = stepData.altText;
  stickyVideoContainer.role = "tooltip";

  prevStepData = stepData.filePath;
}

function stopPlayingVideo() {
  // To properly do this, we'd have to know which streaming service, if any, is currently
  // playing and call a different API for each service to stop their player.
  // Instead, we'll just blank out the source of the video -- it will get loaded again the
  // next time a step is invoked.
  const iframe = document.getElementById("the-iframe-video");
  if (iframe != null) {
    iframe.src = "";
  }
}

function addAltTextToMap(mapElement, altText) {
  mapElement.setAttribute("aria-label", altText);
}

function initScrollama() {
  scroller
    .setup({
      step: ".scrolly-container .step",
      offset: 0.5, // what % from the top of the viewport the step should be considered "entered"
      debug: false,
    })
    .onStepEnter(handleStepEnter);

  // setup resize event
  window.addEventListener("resize", scroller.resize);
}
