import {
  MinPriorityQueue,
  MaxPriorityQueue,
} from "@datastructures-js/priority-queue";

class MedianTracker {
  private lower: MaxPriorityQueue<number>;
  private upper: MinPriorityQueue<number>;

  constructor(numbers: number[]) {
    this.lower = new MaxPriorityQueue();
    this.upper = new MinPriorityQueue();

    numbers.forEach((num) => this.add(num));
  }

  private balance(): void {
    while (this.lower.size() > this.upper.size() + 1) {
      const value = this.lower.dequeue();
      if (value !== null) this.upper.enqueue(value);
    }
  
    while (this.upper.size() > this.lower.size()) {
      const value = this.upper.dequeue();
      if (value !== null) this.lower.enqueue(value);
    }
  }
  
  

  public add(x: number): void {
    if (this.lower.isEmpty() || x < this.lower.front()!) {
      this.lower.enqueue(x);
    } else {
      this.upper.enqueue(x);
    }
    this.balance();
  }

  public remove(x: number): boolean {
    if (this.lower.isEmpty() && this.upper.isEmpty()) {
      return false;
    }
    
    if (this.lower.toArray().includes(x)) {

      const newLower = new MaxPriorityQueue<number>();
      this.lower.toArray()
        .filter((num: number) => num !== x)
        .forEach(num => newLower.enqueue(num));
      this.lower = newLower;
    } else if (this.upper.toArray().includes(x)) {

      const newUpper = new MinPriorityQueue<number>();
      this.upper.toArray()
        .filter((num: number) => num !== x)
        .forEach(num => newUpper.enqueue(num));
      this.upper = newUpper;
    } else {
      return false;
    }

    this.balance();
    return true;
  }

  public getMedian(): number | null {
    if (this.lower.isEmpty() && this.upper.isEmpty()) {
      return null;
    }
    if (this.lower.size() > this.upper.size()) {
      return this.lower.front();
    }
    return (this.lower.front()! + this.upper.front()!) / 2;
  }
}

export default MedianTracker;
