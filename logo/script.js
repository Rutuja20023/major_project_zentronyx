const logo = document.querySelector(".zentronyx-logo");
const logoContainer = document.querySelector(".logo-container");


// ============================================
// CLICK LOGO → REPLAY ANIMATION
// ============================================

logo.addEventListener("click", () => {

    // Remove previous replay class
    logo.classList.remove("replay");

    // Force browser to recalculate the animation
    void logo.offsetWidth;

    // Start animation again
    logo.classList.add("replay");

});


// ============================================
// MOUSE PARALLAX EFFECT
// ============================================

document.addEventListener("mousemove", (event) => {

    const x =
        event.clientX / window.innerWidth - 0.5;

    const y =
        event.clientY / window.innerHeight - 0.5;


    const rotateX = y * -5;

    const rotateY = x * 5;


    logoContainer.style.transform =

        `perspective(700px)
         rotateX(${rotateX}deg)
         rotateY(${rotateY}deg)`;

});


// ============================================
// RESET WHEN MOUSE LEAVES
// ============================================

document.addEventListener("mouseleave", () => {

    logoContainer.style.transform =
        "perspective(700px) rotateX(0deg) rotateY(0deg)";

});