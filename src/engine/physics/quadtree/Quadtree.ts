export interface Body {
    x: number;
    y: number;
    radius: number;
    entity: number | string;
    // Optional: add mass or velocity if needed for narrow-phase,
    // but typically we just need the ID to look up component data.
}

export class Rectangle {
    // x, y are the center of the rectangle
    constructor(
        public x: number,
        public y: number,
        public width: number, // Half-width (extent x)
        public height: number, // Half-height (extent y)
    ) {}

    public contains(point: Body): boolean {
        return (
            point.x >= this.x - this.width &&
            point.x <= this.x + this.width &&
            point.y >= this.y - this.height &&
            point.y <= this.y + this.height
        );
    }

    public intersects(range: Rectangle): boolean {
        return !(
            range.x - range.width > this.x + this.width ||
            range.x + range.width < this.x - this.width ||
            range.y - range.height > this.y + this.height ||
            range.y + range.height < this.y - this.height
        );
    }

    // Raw intersection check to avoid allocating a Rectangle object for the range
    public intersectsRaw(
        rx: number,
        ry: number,
        rw: number,
        rh: number,
    ): boolean {
        return !(
            rx - rw > this.x + this.width ||
            rx + rw < this.x - this.width ||
            ry - rh > this.y + this.height ||
            ry + rh < this.y - this.height
        );
    }
}

const MIN_EXTENT = 1; // Minimum half-width/height to prevent infinite subdivision on stacked points

export class Quadtree {
    // --- Object Pooling ---
    private static readonly pool: Quadtree[] = [];

    public static obtain(boundary: Rectangle, capacity: number): Quadtree {
        const node = Quadtree.pool.pop();
        if (node) {
            node.boundary = boundary;
            node.capacity = capacity;
            node.divided = false;
            node.points.length = 0;
            return node;
        }
        return new Quadtree(boundary, capacity);
    }

    public static release(node: Quadtree): void {
        node.clear();
        Quadtree.pool.push(node);
    }

    // --- Instance ---
    private points: Body[] = [];
    private divided = false;

    // Children
    private ne: Quadtree | null = null;
    private nw: Quadtree | null = null;
    private se: Quadtree | null = null;
    private sw: Quadtree | null = null;

    constructor(
        public boundary: Rectangle,
        public capacity: number,
    ) {}

    public insert(body: Body): boolean {
        // Broad phase check: if the point isn't in this node's boundary, ignore
        if (!this.boundary.contains(body)) {
            return false;
        }

        if (this.points.length < this.capacity && !this.divided) {
            this.points.push(body);
            return true;
        }

        if (!this.divided) {
            this.subdivide();
        }

        // We push to children. If it fits in a child, great.
        // Note: In some loose quadtrees, large objects sticking out might be stored in parent.
        // Here we use standard center-point insertion for speed.
        // Collision queries must account for radius by expanding the search box.
        if (this.ne?.insert(body)) return true;
        if (this.nw?.insert(body)) return true;
        if (this.se?.insert(body)) return true;
        if (this.sw?.insert(body)) return true;

        // Fallback (floating point errors, edge cases, or max depth reached), just store it here
        this.points.push(body);
        return true;
    }

    private subdivide(): void {
        const { x, y, width, height } = this.boundary;

        // Prevent infinite recursion when points are stacked
        if (width <= MIN_EXTENT || height <= MIN_EXTENT) {
            return;
        }

        const hw = width / 2;
        const hh = height / 2;

        // Create children from pool
        this.ne = Quadtree.obtain(
            new Rectangle(x + hw, y - hh, hw, hh),
            this.capacity,
        );
        this.nw = Quadtree.obtain(
            new Rectangle(x - hw, y - hh, hw, hh),
            this.capacity,
        );
        this.se = Quadtree.obtain(
            new Rectangle(x + hw, y + hh, hw, hh),
            this.capacity,
        );
        this.sw = Quadtree.obtain(
            new Rectangle(x - hw, y + hh, hw, hh),
            this.capacity,
        );

        this.divided = true;

        // Redistribute existing points to children
        // This keeps the tree clean and ensures leaf-only storage where possible
        const oldPoints = this.points;
        this.points = [];

        for (const p of oldPoints) {
            const inserted =
                this.ne.insert(p) ||
                this.nw.insert(p) ||
                this.se.insert(p) ||
                this.sw.insert(p);

            if (!inserted) {
                this.points.push(p);
            }
        }
    }

    /**
     * Standard rectangular query.
     * Use this if you want to find everything within a box.
     */
    public query(range: Rectangle, found: Body[] = []): Body[] {
        return this.queryRaw(
            range.x,
            range.y,
            range.width,
            range.height,
            found,
        );
    }

    /**
     * Internal raw query to avoid object allocation.
     */
    private queryRaw(
        rx: number,
        ry: number,
        rw: number,
        rh: number,
        found: Body[],
    ): Body[] {
        if (!this.boundary.intersectsRaw(rx, ry, rw, rh)) {
            return found;
        }

        // Check points in this node
        // We do a manual contains check here to avoid allocating a Point/Body object for the range check
        for (const p of this.points) {
            if (
                p.x >= rx - rw &&
                p.x <= rx + rw &&
                p.y >= ry - rh &&
                p.y <= ry + rh
            ) {
                found.push(p);
            }
        }

        if (this.divided) {
            this.nw?.queryRaw(rx, ry, rw, rh, found);
            this.ne?.queryRaw(rx, ry, rw, rh, found);
            this.sw?.queryRaw(rx, ry, rw, rh, found);
            this.se?.queryRaw(rx, ry, rw, rh, found);
        }

        return found;
    }

    /**
     * Radius-aware query.
     * Finds all bodies that *might* collide with the given circle (x, y, radius).
     * It constructs a bounding box around the circle and queries that.
     * * @param x Center X
     * @param y Center Y
     * @param radius Radius of the query circle
     * @param found Array to populate
     * @returns The populated array of bodies
     */
    public queryRadius(
        x: number,
        y: number,
        radius: number,
        found: Body[] = [],
    ): Body[] {
        // Construct a search box that covers the circle
        // Pass raw coordinates to internal method to avoid allocating a Rectangle object.
        return this.queryRaw(x, y, radius, radius, found);
    }

    public clear(): void {
        this.points.length = 0;

        if (this.divided) {
            if (this.ne) Quadtree.release(this.ne);
            if (this.nw) Quadtree.release(this.nw);
            if (this.se) Quadtree.release(this.se);
            if (this.sw) Quadtree.release(this.sw);

            this.ne = null;
            this.nw = null;
            this.se = null;
            this.sw = null;
            this.divided = false;
        }
    }
}
