export async function resizeImage(file, width = 400, height = 400) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(resolve, "image/jpeg", 0.9); // JPG mit 90% Qualität
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  }
  