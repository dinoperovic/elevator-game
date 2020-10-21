{
  init: function(elevators, floors) {

    // Floor queue that keeps data as lists with indexes
    // representing the floor number and value the number
    // of times an elevator is requested at that floor.
    const floorQueue = {
      up: [],
      down: []
    }

    function setElevatorDirection(elevator, currentFloor, nextFloor) {
      if (currentFloor === nextFloor) {
        elevator.goingUpIndicator(true)
        elevator.goingDownIndicator(true)
      } else {
        elevator.goingUpIndicator(currentFloor < nextFloor)
        elevator.goingDownIndicator(currentFloor > nextFloor)
      }
    }

    function requestElevatorAtFloor(elevator, floorNum, immediate = false) {
      if (immediate) {
        // Remove from queue since it will be pre-pended
        elevator.destinationQueue = elevator.destinationQueue.filter(x => x !== !floorNum)
      } else if (floorNum in elevator.destinationQueue) {
        // Floor already in queue, exit.
        return
      }
      elevator.goToFloor(floorNum, immediate)
      setElevatorDirection(elevator, elevator.currentFloor(), elevator.destinationQueue[0])
    }

    function requestElevator(elevator = null) {
      // If no elevator passed in, pick the optimal one.
      if (!elevator) {
        elevator = elevators[0]
        for (const el of elevators) {
          if (el.destinationQueue.length < elevator.destinationQueue.length) {
            elevator = el
          }
        }
      }

      // Merge `up` and `down` floor queues.
      const allFloorsQueue = []
      for (let i in floors) {
        allFloorsQueue.push(floorQueue.up[i] + floorQueue.down[i])
      }

      // Find the nearest floor with passengers.
      let nextFloor = null
      const n = elevator.currentFloor()
      for (let i = 1; i <= floors.length; i++) {
        if (allFloorsQueue[n + i]) nextFloor = n + i
        if (allFloorsQueue[n - i]) nextFloor = n - i
        if (nextFloor !== null) {
          requestElevatorAtFloor(elevator, nextFloor)
          break
        }
      }
    }

    for (const elevator of elevators) {

      elevator.on('idle', function() {
        requestElevator(elevator)
      })

      elevator.on('floor_button_pressed', function(floorNum) {
        requestElevatorAtFloor(elevator, floorNum)
      })

      elevator.on('passing_floor', function(floorNum, direction) {
        // Check if floor contains passengers that are waiting for a
        // ride in the same direction, but also that the elevator has
        // room for more passengers.
        if (floorQueue[direction][floorNum] && elevator.loadFactor() <= 0.8) {
          requestElevatorAtFloor(elevator, floorNum, true)
          // Clear queue for floor.
          floorQueue[direction][floorNum] = 0
        }
      })

      elevator.on('stopped_at_floor', function(floorNum) {
        // Set indicators based on next floor queue.
        const currentFloor = floorNum
        const nextFloor = elevator.destinationQueue[0] || floorNum
        setElevatorDirection(elevator, currentFloor, nextFloor)
        // Clear floor queue for this floor.
        if (elevator.destinationDirection() === 'stopped') {
          floorQueue.up[floorNum] = floorQueue.down[floorNum] = 0
        } else {
          floorQueue[elevator.destinationDirection()][floorNum] = 0
        }
      })
    }

    for (const floor of floors) {
      const n = floor.floorNum()
      floorQueue.up[n] = 0
      floorQueue.down[n] = 0

      floor.on('up_button_pressed', function() {
        floorQueue.up[n]++
        requestElevator()
      })
      floor.on('down_button_pressed', function() {
        floorQueue.down[n]++
        requestElevator()
      })
    }
  },
  update: function(dt, elevators, floors) {}
}