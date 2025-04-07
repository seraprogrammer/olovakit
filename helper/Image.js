// Image Optimization.js
import { createElement, memo } from "olovakit";

// Simple image component with blur placeholder using vanilla JavaScript
const Image = memo((props) => {
  // Extract props
  const src = props.src;
  const width = props.width || 100;
  const height = props.height || 100;
  const placeholder = props.placeholder || "empty";
  const { className, objectFit, objectPosition, ...rest } = props;

  // Create a unique ID for this image instance
  const imageId = `img_${Math.random().toString(36).substr(2, 9)}`;

  // Container style
  const containerStyle = {
    position: "relative",
    width: width + "px",
    height: height + "px",
    display: "inline-block",
    overflow: "hidden",
  };

  // Placeholder style
  const placeholderStyle = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "#e6e6e6",
    filter: "blur(8px)",
    transform: "scale(1.05)",
    transition: "opacity 0.3s ease-in-out",
  };

  // Image style
  const imageStyle = {
    display: "block",
    width: "100%",
    height: "100%",
    objectFit: objectFit || "cover",
    objectPosition: objectPosition || "center",
    opacity: 0,
    transition: "opacity 0.3s ease-in-out",
  };

  // Use setTimeout to set up event handlers after render
  setTimeout(() => {
    const imgElement = document.getElementById(imageId);
    const placeholderElement = document.getElementById(
      `${imageId}_placeholder`
    );

    if (imgElement) {
      // Handle image load with direct DOM manipulation
      imgElement.onload = function () {
        imgElement.style.opacity = 1;
        if (placeholderElement) {
          placeholderElement.style.opacity = 0;
        }
      };

      // If image is already loaded (from cache)
      if (imgElement.complete) {
        imgElement.style.opacity = 1;
        if (placeholderElement) {
          placeholderElement.style.opacity = 0;
        }
      }
    }
  }, 0);

  return createElement(
    "div",
    { style: containerStyle, className },
    placeholder === "blur"
      ? createElement("div", {
          id: `${imageId}_placeholder`,
          style: placeholderStyle,
        })
      : null,
    createElement("img", {
      ...rest,
      id: imageId,
      src: src,
      style: imageStyle,
      width: width,
      height: height,
    })
  );
});

// Create Optimization object with Image component
const Optimization = {
  Image,
};

export default Optimization;
