{
  init: function(elevators, floors) {

    // Keep a queue of floor requests.
    let queue = []

    function sendElevator(elevator, floorNum) {
      // Send elevator to the specified floor and make sure
      // the elevator queue is sorted in the right direction.

      if (elevator.destinationQueue.includes(floorNum)) {
        // Destination floor is already in elevator queue, exit.
        return
      }

      elevator.destinationQueue.push(floorNum)
      elevator.destinationQueue.sort()
      const isGoingDown = elevator.currentFloor() > elevator.destinationQueue[0]
      if (isGoingDown) elevator.destinationQueue.reverse()
      elevator.checkDestinationQueue()
    }

    for (const i in elevators) {
      const elevator = elevators[i]
      elevator.id = i

      elevator.on('idle', function() {
        sendElevator(elevator, queue.shift() || 0)
      })

      elevator.on('floor_button_pressed', function(floorNum) {
        sendElevator(elevator, floorNum)
      })

      elevator.on('passing_floor', function(floorNum, direction) {
        // When passing a floor, check for passenger awaiting a ride,
        // also make sure that elevator has room before stopping.

        const isSameDirection = (
          floors[floorNum].buttonStates.down && direction === 'down' ||
          floors[floorNum].buttonStates.up && direction === 'up'
        )

        if (elevator.loadFactor() <= 0.6 && isSameDirection) {
          // Prepend floor to the queue and remove if it already existed.
          elevator.destinationQueue = [
            floorNum,
            ...elevator.destinationQueue.filter(x => x !== floorNum)
          ]
          elevator.checkDestinationQueue()
        }
      })

      elevator.on('stopped_at_floor', function(floorNum) {
        // Remove floor from queue.
        if (queue.includes(floorNum)) {
          queue = queue.filter(x => x !== floorNum)
        }
      })
    }

    for (const floor of floors) {
      floor.on('up_button_pressed down_button_pressed', function() {
        // Add to floor queue if it's not already present.
        if (!queue.includes(floor.floorNum())) {
          queue.push(floor.floorNum())
        }
      })
    }
  },
  update: function(dt, elevators, floors) {}
}