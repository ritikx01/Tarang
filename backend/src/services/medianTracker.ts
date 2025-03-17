class MedianTracker {
  private lower: number[]; // Max-heap (negated numbers for simulation)
  private upper: number[]; // Min-heap

  constructor(numbers: number[]) {
    const sortedNums = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sortedNums.length / 2);

    // Max-heap for the lower half (negated values)
    this.lower = sortedNums.slice(0, mid).map((x) => -x);
    this.heapify(this.lower);

    // Min-heap for the upper half
    this.upper = sortedNums.slice(mid);
    this.heapify(this.upper);

    this.balance();
  }

  private balance(): void {
    while (this.lower.length > this.upper.length + 1) {
      this.upper.push(-this.popHeap(this.lower));
      this.heapify(this.upper);
    }

    while (this.upper.length > this.lower.length) {
      this.lower.push(-this.popHeap(this.upper));
      this.heapify(this.lower);
    }
  }

  public remove(x: number): boolean {
    const negX = -x;

    if (this.removeFromHeap(this.lower, negX)) {
      this.heapify(this.lower);
    } else if (this.removeFromHeap(this.upper, x)) {
      this.heapify(this.upper);
    } else {
      return false;
    }

    this.balance();
    return true;
  }

  public add(x: number): void {
    if (this.lower.length === 0 || x < -this.lower[0]) {
      this.lower.push(-x);
      this.heapify(this.lower);
    } else {
      this.upper.push(x);
      this.heapify(this.upper);
    }

    this.balance();
  }

  public getMedian(): number {
    if (this.lower.length > this.upper.length) {
      return -this.lower[0];
    }

    return (-this.lower[0] + this.upper[0]) / 2;
  }

  // Utility methods
  private heapify(heap: number[]): void {
    heap.sort((a, b) => a - b); // Simulate heapify
  }

  private popHeap(heap: number[]): number {
    if (heap.length === 0) {
      throw new Error("Heap is empty");
    }
    return heap.shift()!;
  }

  private removeFromHeap(heap: number[], value: number): boolean {
    const index = heap.indexOf(value);
    if (index !== -1) {
      heap.splice(index, 1);
      return true;
    }
    return false;
  }
}

export default MedianTracker;
