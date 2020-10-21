{
  init: function(elevators, floors) {

    // Floor queue that keeps data about requested
    // rides in both up and down directions.
    const floorQueue = {
      up: [],
      down: []
    }

    function setElevatorIndicators(elevator, direction = null) {
      if (direction) {
        elevator.goingUpIndicator(direction === 'up')
        elevator.goingDownIndicator(direction === 'down')
      } else {
        elevator.goingUpIndicator(true)
        elevator.goingDownIndicator(true)
      }
    }

    function findElevatorNextFloor(elevator) {
      // Find the preferred floors for elevator in both directions.
      const floorsUp = floorQueue.up.filter(x => x > elevator.currentFloor())
      const floorsDown = floorQueue.down.filter(x => x < elevator.currentFloor())

      // Set fallback floors that exclude current floor.
      const otherUp = floorQueue.up.filter(x => x !== elevator.currentFloor())
      const otherDown = floorQueue.down.filter(x => x !== elevator.currentFloor())

      let nextFloor = null
      let direction = null

      if (floorsUp.length) {
        // There are upper floors with passengers going up.
        nextFloor = Math.min(...floorsUp)
        direction = 'up'
      }
      else if (floorsDown.length) {
        // There are lower floors with passengers going down.
        nextFloor = Math.max(...floorsDown)
        direction = 'down'
      }
      else if (otherUp.length) {
        // There are lower floors with passengers going up.
        nextFloor = Math.min(...otherUp)
        direction = 'down'
      }
      else if (otherDown.length) {
        // There are upper floors with passengers going down.
        nextFloor = Math.max(...otherDown)
        direction = 'up'
      }

      return [nextFloor, direction]
    }

    function runElevator(elevator) {
      const [nextFloor, direction] = findElevatorNextFloor(elevator)

      // Set elevator direction.
      // If direction is null turn's on all indicators.
      setElevatorIndicators(elevator, direction)

      if (nextFloor !== null) {
        // Remove next floor from queue.
        floorQueue[direction] = floorQueue[direction].filter(x => x !== nextFloor)

        // Go to next floor.
        elevator.goToFloor(nextFloor)
      } else {
        // Queue is empty, wait.
        elevator.stop()
      }
    }

    for (const i in elevators) {
      const elevator = elevators[i]
      elevator.id = i

      elevator.on('idle', function() {
        runElevator(elevator)
      })

      elevator.on('floor_button_pressed', function(floorNum) {
        if (!(floorNum in elevator.destinationQueue)) {
          elevator.destinationQueue.push(floorNum)
        }

        // Sort elevator queue to keep it going in the same direction.
        if (elevator.goingUpIndicator()) {
          elevator.destinationQueue.sort((a, b) => a - b)
          floorQueue.up = floorQueue.up.filter(x => x !== floorNum)
        } else if (elevator.goingDownIndicator()) {
          elevator.destinationQueue.sort((a, b) => b - a)
          floorQueue.down = floorQueue.down.filter(x => x !== floorNum)
        }

        // Remove duplicates.
        elevator.destinationQueue = [...new Set(elevator.destinationQueue)]
        elevator.checkDestinationQueue()
      })

      elevator.on('passing_floor', function(floorNum, direction) {
        const isSameDirection = (
          direction === 'up' && elevator.goingUpIndicator() ||
          direction === 'down' && elevator.goingDownIndicator()
        )
        const isInQueue = floorQueue[direction].includes(floorNum)

        const isEligibleForPickup = isInQueue && isSameDirection && elevator.loadFactor() <= 0.6
        const isInPressedFloors = elevator.getPressedFloors().includes(floorNum)

        // If a floor queue exists in the same direction the elevator is
        // headed + the elevator has room, pick up the passengers.
        if (isInPressedFloors || isEligibleForPickup) {
          // Place passing floor to the front of queue
          // ensuring that it's removed if already exists.
          elevator.destinationQueue = [
            floorNum, ...elevator.destinationQueue.filter(x => x !== floorNum)
          ]
          elevator.checkDestinationQueue()
          // Remove from floor queue.
          floorQueue[direction] = floorQueue[direction].filter(x => x !== floorNum)
        }
      })

      elevator.on('stopped_at_floor', function () {
        // Set elevator indicators for top and bottom floor cases.
        if (elevator.currentFloor() === 0) {
          setElevatorIndicators(elevator, 'up')
        } else if (elevator.currentFloor() === floors.length - 1) {
          setElevatorIndicators(elevator, 'down')
        } else {
          setElevatorIndicators(elevator)
        }
      })
    }

    for (const floor of floors) {
      // Add to floor queue.
      floor.on('up_button_pressed', function() {
        floorQueue.up.push(floor.floorNum())
      })
      floor.on('down_button_pressed', function() {
        floorQueue.down.push(floor.floorNum())
      })
    }
  },
  update: function(dt, elevators, floors) {}
}