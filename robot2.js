"use strict";

/*
   Author: Katherine Couturier
   Date:   11/7/25

   Filename:   rm_robot.js  

	*Created using ChatGPT

   Function List:
   functionname(parameter)
      Creates ...
	
*/

// wait until page is loaded
window.onload = function() {
	// references to page elements
    const topConveyor = document.getElementById("top-conveyor");
    const bottomConveyor = document.getElementById("bottom-conveyor");
    const gripper = document.getElementById("gripper");
    const scoreboard = document.getElementById("scoreboard");
    const startBtn = document.getElementById("startBtn");
    const stopBtn = document.getElementById("stopBtn");
    const resetBtn = document.getElementById("resetBtn");
    const pullLine = document.getElementById("pull-line");

	// declare variables
    var topSpeed = 2;		// start speed of top conveyor
    var bottomSpeed = 2;	// start speed of bottom conveyor
    var gameOver = false;	// game status
    var score = 0;			// number of items removed
    var topInterval, bottomInterval;
    var draggingItem = null;
    var dragOffsetX = 0, dragOffsetY = 0;
    var topScroll = 0, bottomScroll = 0;

	// generate random color for item  (green = good, purple = scrap)
    function randomColor() {
        const colors = ["seagreen", "purple"];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // move conveyors at same speed as items
	function animateConveyors() {
		// stop if game over
		if (gameOver) return;
		// scroll belt background
		topScroll += topSpeed;
		bottomScroll += bottomSpeed;

		// Use modulo to loop the pattern
		topScroll %= 40;     
		bottomScroll %= 40;

		// assign new positions
		topConveyor.style.backgroundPosition = `${topScroll}px 0`;
		bottomConveyor.style.backgroundPosition = `${bottomScroll}px 0`;

		// calls function repeatedly
		requestAnimationFrame(animateConveyors);
	}

    // create top conveyor item
	function createTopItem() {
		// stop if game over
		if (gameOver) return;

		// creates a new item
		const item = document.createElement("div");
		item.className = "item top-item";
		item.dataset.belt = "top";
		item.textContent = "#";
		item.style.background = randomColor();
		item.style.left = "-60px";
		topConveyor.appendChild(item);

		// position of item
		var pos = -60;
		// location of arm zone
		const armZone = 380;
		
		var animFrameId;

		// item moves by topSpeed distance with every frame
		function animate() {
			// stop if game over
			if (gameOver) return;
			// calculates new position
			pos += topSpeed;
			// assigns new position
			item.style.left = pos + "px";

			// if purple item enters arm zone, grab item and stop animation
			if (pos >= armZone - 10 && pos <= armZone + 10 && item.style.background === "purple") {
				grabItem(item);
				cancelAnimationFrame(animFrameId);
				return;
			}

			// if a purple item reaches the end of the belt, the game is over
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

			// loop to animate box
			animFrameId = requestAnimationFrame(animate);
			// store animFrameId 
			item.animFrameId = animFrameId;
		}
		// loop to animate box
		animFrameId = requestAnimationFrame(animate);
		// store animFrameId 
		item.animFrameId = animFrameId;
	}

	// function to control robot arm
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

			// Reset to down position
			setTimeout(() => {
				gripper.classList.remove("down");
			}, 350);
		}, 550);
	}


    // crate item on bottom conveyor
    function createBottomItem() {
		// stop if game over
		if (gameOver) return;
		
		// create item
		const item = document.createElement("div");
		item.className = "item bottom-item";
		item.dataset.belt = "bottom";
		item.textContent = "!";
		item.style.background = randomColor();
		item.style.left = "-60px";
		bottomConveyor.appendChild(item);

		// Enable drag for purple item
		if (item.style.background === "purple") {
			item.addEventListener("mousedown", (e) => {
				e.preventDefault();
				startDrag(item, e);
			});
		}

		// if a green item is clicked, the game is over
		item.addEventListener("click", () => {
			if (!gameOver && item.style.background === "seagreen") {
				endGame("You clicked a green box!");
			}
		});

		// initialize position
		var pos = -60;
		var animFrameId;

		// item moves by bottomSpeed distance with every frame
		function animate() {
			// stop if game over
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

			// ends game if purple item escapes the bottom conveyor
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

			// loop to animate box
			animFrameId = requestAnimationFrame(animate);
			// store animFrameId 
			item.animFrameId = animFrameId;
		}
		// loop to animate box
		animFrameId = requestAnimationFrame(animate);
		// store animFrameId 
		item.animFrameId = animFrameId;
	}

    // function to control items being dragged
	function startDrag(item, startEvent) {
		// stop if game over
		if (gameOver) return;
		
		// identify dragged item
		draggingItem = item;
		item.dataset.dragging = "1";
		item.classList.add("dragging");

		// Calculate where inside the item the user clicked,
		const rect = item.getBoundingClientRect();
		dragOffsetX = startEvent.clientX - rect.left;
		dragOffsetY = startEvent.clientY - rect.top;

		// Stop the conveyor animation while dragging
		if (item.animFrameId) cancelAnimationFrame(item.animFrameId);

		// Move to #game layer for free movement
		const game = document.getElementById("game");
		const gameRect = game.getBoundingClientRect();
		game.appendChild(item);

		// update coordinates in game layer
		item.style.position = "absolute";
		item.style.left = rect.left - gameRect.left + "px";
		item.style.top = rect.top - gameRect.top + "px";

		// highlight drop zone
		pullLine.classList.add("active");
	}

	function updateDrag(e) {
		// stop if nothing is being dragged
		if (!draggingItem) return;

		// get bounds of game area and calculate new postions 
		const gameRect = document.getElementById("game").getBoundingClientRect();
		const x = e.clientX - gameRect.left - dragOffsetX;
		let y = e.clientY - gameRect.top - dragOffsetY;

		// Prevent dragging above bottom conveyor
		const clampTop = bottomConveyor.offsetTop - 40;
		if (y < clampTop) y = clampTop;

		// assign new drag positions
		draggingItem.style.left = `${x}px`;
		draggingItem.style.top = `${y}px`;
	}


	function endDrag() {
		if (!draggingItem) return;

		const item = draggingItem;
		
		// clear drag state and remove drop zone highlight
		draggingItem = null;
		pullLine.classList.remove("active");
		delete item.dataset.dragging;
		item.classList.remove("dragging");

		// If game ended mid-drag, remove item 
		if (gameOver) {
			item.remove();
			return;
		}

		// Check drop below pull line
		const lineRect = pullLine.getBoundingClientRect();
		const itemRect = item.getBoundingClientRect();
		const itemCenterY = itemRect.top + itemRect.height / 2;

		// if item is below drop zone remove item and update score.
		if (itemCenterY > lineRect.top) {
			// Successful drop — remove and score
			item.remove();
			score++;
			scoreboard.textContent = "Score: " + score;
			delete item.dataset.belt;
		} else {
			// move item back to the bottom conveyor if dropped too high
			item.style.top = `${bottomConveyor.offsetTop + 20}px`;
		}
	}

	// event listeners to smooth drag 
    document.addEventListener("mousemove", updateDrag);
    document.addEventListener("mouseup",   endDrag);

    // start game
    function startGame() {
		// reset variables
        resetGame();
		// start creating items on both conveyors
        spawnTopItem();
        spawnBottomItem();
		// start scrolling conveyors
        requestAnimationFrame(animateConveyors);
    }

    function stopGame() {
		// prevent multiple stops
        if (gameOver) return;
		// set game over to true
        gameOver = true;
		// stop creating items
        clearTimeout(topInterval);
        clearTimeout(bottomInterval);
		// alert final score
        alert("Game Stopped! Final Score: " + score);
    }

    function resetGame() {
		// stop creating items
		clearTimeout(topInterval);
		clearTimeout(bottomInterval);

		// Cancel animation and remove all items
		document.querySelectorAll(".item").forEach(el => {
			if (el.animFrameId) cancelAnimationFrame(el.animFrameId);
			el.remove();
		});

		// clear conveyor elements
		topConveyor.innerHTML = "";
		bottomConveyor.innerHTML = "";

		// reset variables
		score = 0;
		topSpeed = 2;
		bottomSpeed = 2;
		topScroll = 0;
		bottomScroll = 0;
		gameOver = false;
		scoreboard.textContent = "Score: 0";
	}

    function spawnTopItem() {
		// stop if game over
        if (gameOver) return;
		// create new top conveyor item
        createTopItem();
		// increase speed
        topSpeed += 0.08;
		// schedule next item, increasing speed with minimum frequency of one every 0.2 seconds
        topInterval = setTimeout(spawnTopItem, Math.max(200, 1000 - topSpeed * 80));
    }

    function spawnBottomItem() {
        // stop if game over
		if (gameOver) return;
        // create new bottom conveyor item
		createBottomItem();
		// increase speed
        bottomSpeed += 0.08;
		// schedule next item, increasing speed with minimum frequency of one every 0.2 seconds
        bottomInterval = setTimeout(spawnBottomItem, Math.max(200, 1000 - bottomSpeed * 80));
    }

    function endGame(reason = "Game Over!") {
		if (gameOver) return;
		gameOver = true;
		// stop creating items
		clearTimeout(topInterval);
		clearTimeout(bottomInterval);

		// Cancel all animations 
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

		// set deley for final score alert
		setTimeout(() => {
			alert(`${reason}\nFinal Score: ${score}`);
		}, 10);
	}

	// add even listeners to buttons
    startBtn.addEventListener("click", startGame);
    stopBtn.addEventListener("click", stopGame);
    resetBtn.addEventListener("click", resetGame);
};
