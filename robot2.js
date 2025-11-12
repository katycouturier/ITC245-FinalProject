"use strict";

/*
   Author: Katherine Couturier
   Date:   11/7/25

   Filename:   rm_robot.js  

   Function List:
   functionname(parameter)
      Creates ...
	
*/


window.onload = function() {
    const topConveyor = document.getElementById("top-conveyor");
    const bottomConveyor = document.getElementById("bottom-conveyor");
    const gripper = document.getElementById("gripper");
    const scoreboard = document.getElementById("scoreboard");
    const startBtn = document.getElementById("startBtn");
    const stopBtn = document.getElementById("stopBtn");
    const resetBtn = document.getElementById("resetBtn");
    const pullLine = document.getElementById("pull-line");

    let topSpeed = 2;
    let bottomSpeed = 2;
    let gameOver = false;
    let score = 0;	
    let topInterval, bottomInterval;
    let draggingItem = null;
    let dragOffsetX = 0, dragOffsetY = 0;
    let topScroll = 0, bottomScroll = 0;

    function randomColor() {
        const colors = ["seagreen", "purple"];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // === MOVE BOTH CONVEYORS IN SYNC WITH ITEM SPEED ===
	function animateConveyors() {
		if (gameOver) return;
		// Scroll same direction, same rate as boxes
		topScroll += topSpeed;
		bottomScroll += bottomSpeed;

		// Use modulo to keep the pattern looping cleanly
		topScroll %= 40;     
		bottomScroll %= 40;

		topConveyor.style.backgroundPosition = `${topScroll}px 0`;
		bottomConveyor.style.backgroundPosition = `${bottomScroll}px 0`;

		requestAnimationFrame(animateConveyors);
	}

    // === TOP CONVEYOR ===
	function createTopItem() {
		if (gameOver) return;

		const item = document.createElement("div");
		item.className = "item top-item";
		item.dataset.belt = "top";
		item.textContent = "#";
		item.style.background = randomColor();
		item.style.left = "-60px";
		topConveyor.appendChild(item);

		let pos = -60;
		const armZone = 380;
		let animFrameId;

		function animate() {
			if (gameOver) return;
			pos += topSpeed;
			item.style.left = pos + "px";

			// Check arm grab
			if (pos >= armZone - 10 && pos <= armZone + 10 && item.style.background === "purple") {
				grabItem(item);
				cancelAnimationFrame(animFrameId);
				return;
			}

			// End condition (only if still in top conveyor)
			if (item.dataset.belt === "top" &&
				item.parentNode === topConveyor &&
				pos > topConveyor.offsetWidth - 50) {
				if (item.style.background === "purple") {
					endGame("A purple box escaped the top belt!");
				} else {
					item.remove();
				}
				cancelAnimationFrame(animFrameId);
				return;
			}

			animFrameId = requestAnimationFrame(animate);
			item.animFrameId = animFrameId;
		}

		animFrameId = requestAnimationFrame(animate);
		item.animFrameId = animFrameId;
	}

    function grabItem(item) {
		// Start with the arm moving UP to grab the box
		gripper.classList.add("up");

		// As the arm rises, the item gets lifted
		setTimeout(() => {
			item.style.transition = "all 0.25s ease-out";
			item.style.top = "-60px";  // lift above belt
			item.style.opacity = "0.7";
		}, 120);

		// Item fully lifted and removed
		setTimeout(() => {
			item.style.top = "-100px";
			item.style.opacity = "0";
		}, 300);

		// After lifting, remove the item and return arm down
		setTimeout(() => {
			if (item.parentNode) item.remove();

			// Lower arm back down
			gripper.classList.remove("up");
			gripper.classList.add("down");

			// Smooth reset to resting (down) position
			setTimeout(() => {
				gripper.classList.remove("down");
			}, 350);
		}, 550);
	}


    // === BOTTOM CONVEYOR ===
    function createBottomItem() {
		if (gameOver) return;

		const item = document.createElement("div");
		item.className = "item bottom-item";
		item.dataset.belt = "bottom";
		item.textContent = "!";
		item.style.background = randomColor();
		item.style.left = "-60px";
		bottomConveyor.appendChild(item);

		// Enable drag for purple boxes
		if (item.style.background === "purple") {
			item.addEventListener("mousedown", (e) => {
				e.preventDefault();
				startDrag(item, e);
			});
		}

		// Green click = game over
		item.addEventListener("click", () => {
			if (!gameOver && item.style.background === "seagreen") {
				endGame("You clicked a green box!");
			}
		});

		let pos = -60;
		let animFrameId;

		function animate() {
			if (gameOver) return;

			// Only move if still inside bottom conveyor and not being dragged
			if (!item.dataset.dragging && item.parentNode === bottomConveyor) {
				pos += bottomSpeed;
				item.style.left = pos + "px";
			}

			// Stop animation if detached
			if (item.parentNode !== bottomConveyor) {
				cancelAnimationFrame(animFrameId);
				return;
			}

			// Escape condition (only if still on correct belt)
			if (item.dataset.belt === "bottom" &&
				item.parentNode === bottomConveyor &&
				pos > bottomConveyor.offsetWidth - 50 &&
				!item.dataset.dragging) {

				if (item.style.background === "purple") {
					endGame("A purple box escaped the bottom belt!");
				} else {
					item.remove();
				}
				cancelAnimationFrame(animFrameId);
				return;
			}

			animFrameId = requestAnimationFrame(animate);
			item.animFrameId = animFrameId;
		}

		animFrameId = requestAnimationFrame(animate);
		item.animFrameId = animFrameId;
	}

    // === DRAG HELPERS ===
	function startDrag(item, startEvent) {
		if (gameOver) return;

		draggingItem = item;
		item.dataset.dragging = "1";
		item.classList.add("dragging");

		const rect = item.getBoundingClientRect();
		dragOffsetX = startEvent.clientX - rect.left;
		dragOffsetY = startEvent.clientY - rect.top;

		// Stop the conveyor animation while dragging
		if (item.animFrameId) cancelAnimationFrame(item.animFrameId);

		// Move to #game layer for free movement
		const game = document.getElementById("game");
		const gameRect = game.getBoundingClientRect();
		game.appendChild(item);

		item.style.position = "absolute";
		item.style.left = rect.left - gameRect.left + "px";
		item.style.top = rect.top - gameRect.top + "px";

		pullLine.classList.add("active");
	}

	function updateDrag(e) {
		if (!draggingItem) return;

		const gameRect = document.getElementById("game").getBoundingClientRect();
		const x = e.clientX - gameRect.left - dragOffsetX;
		let y = e.clientY - gameRect.top - dragOffsetY;

		// 🔒 Prevent dragging above halfway (keeps below top conveyor)
		const clampTop = bottomConveyor.offsetTop - 40;
		if (y < clampTop) y = clampTop;

		draggingItem.style.left = `${x}px`;
		draggingItem.style.top = `${y}px`;
	}

	function endDrag() {
		if (!draggingItem) return;

		const item = draggingItem;
		draggingItem = null;
		pullLine.classList.remove("active");
		delete item.dataset.dragging;
		item.classList.remove("dragging");

		// If game ended mid-drag, remove it immediately
		if (gameOver) {
			item.remove();
			return;
		}

		// Check drop below pull line
		const lineRect = pullLine.getBoundingClientRect();
		const itemRect = item.getBoundingClientRect();
		const itemCenterY = itemRect.top + itemRect.height / 2;

		if (itemCenterY > lineRect.top) {
			// Successful drop — remove and score
			item.remove();
			score++;
			scoreboard.textContent = "Score: " + score;
			delete item.dataset.belt;
		} else {
			// Snap back to the bottom belt area if dropped too high
			item.style.top = `${bottomConveyor.offsetTop + 20}px`;
		}
	}


    document.addEventListener("mousemove", updateDrag);
    document.addEventListener("mouseup",   endDrag);

    // === GAME CONTROL ===
    function startGame() {
        resetGame();
        spawnTopItem();
        spawnBottomItem();
        requestAnimationFrame(animateConveyors);
    }

    function stopGame() {
        if (gameOver) return;
        gameOver = true;
        clearTimeout(topInterval);
        clearTimeout(bottomInterval);
        alert("Game Stopped! Final Score: " + score);
    }

    function resetGame() {
		clearTimeout(topInterval);
		clearTimeout(bottomInterval);

		// Cancel and remove everything
		document.querySelectorAll(".item").forEach(el => {
			if (el.animFrameId) cancelAnimationFrame(el.animFrameId);
			el.remove();
		});

		topConveyor.innerHTML = "";
		bottomConveyor.innerHTML = "";

		score = 0;
		topSpeed = 2;
		bottomSpeed = 2;
		topScroll = 0;
		bottomScroll = 0;
		gameOver = false;
		scoreboard.textContent = "Score: 0";
	}

    function spawnTopItem() {
        if (gameOver) return;
        createTopItem();
        topSpeed += 0.08;
        topInterval = setTimeout(spawnTopItem, Math.max(200, 1000 - topSpeed * 80));
    }

    function spawnBottomItem() {
        if (gameOver) return;
        createBottomItem();
        bottomSpeed += 0.08;
        bottomInterval = setTimeout(spawnBottomItem, Math.max(200, 1000 - bottomSpeed * 80));
    }

    function endGame(reason = "Game Over!") {
		if (gameOver) return;
		gameOver = true;

		clearTimeout(topInterval);
		clearTimeout(bottomInterval);

		// Cancel all animations immediately
		document.querySelectorAll(".item").forEach(el => {
			if (el.animFrameId) cancelAnimationFrame(el.animFrameId);
		});

		// Remove active drag item
		if (draggingItem) {
			draggingItem.remove();
			draggingItem = null;
		}

		// Remove all boxes
		document.querySelectorAll(".item").forEach(el => el.remove());

		setTimeout(() => {
			alert(`${reason}\nFinal Score: ${score}`);
		}, 10);
	}

    startBtn.addEventListener("click", startGame);
    stopBtn.addEventListener("click", stopGame);
    resetBtn.addEventListener("click", resetGame);
};
