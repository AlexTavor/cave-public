LLD: Scaled Job Throughput System

1. Why (Problem Statement)

The current power grid operates on a binary "nominal vs. brownout" model. The efficiency value calculated for nodes is currently capped at $1.0$. This prevents the simulation from supporting "overclocking," where nodes can utilize surplus energy to work faster. Furthermore, the existing logic does not support scaling resource consumption and reward output proportional to the energy draw.

2. What (Proposed Solution)

We are implementing a Throughput Scaling Model.

Nodes define a Demand Range (Minimum baseDemand to Maximum maxDemand).

efficiency is redefined as a Throughput Multiplier.

Providing baseDemand results in an efficiency of $1.0$.

Providing maxDemand results in an efficiency equal to the $Max/Base$ ratio (e.g., $10.0$ if $max=1000$ and $base=10$).

Bottleneck Principle: If a node requires multiple attributes (e.g., Mind and Social), the final efficiency is the minimum ratio among all required attributes.

Dynamic Progression: The efficiency multiplier directly scales the job fillbar speed and, consequently, the frequency of completions (spawning outputs and burning inputs).

3. How (Implementation Details)

3.1 Data Schema Updates

File: src/data/schemas/components.ts

Responsibility: Define the static structure of the powerSink component.

Logic: Extend the schema to allow nodes to define an upper limit for energy "soaking."

Interface:

Update PowerSinkComponentSchema to include:

baseDemand: AttributeSetSchema (The threshold for $1.0$ efficiency).

maxDemand: AttributeSetSchema.optional() (The ceiling for overclocking).

Defaulting: If maxDemand is omitted, it defaults to baseDemand (capping efficiency at $1.0$).

3.2 Grid Logic Updates

File: src/game/systems/energy/energyDistributionUtils.ts

Responsibility: Calculate the distribution of available power and resolve efficiency multipliers.

Logic Changes:

Summation: Calculate totalBaseDemand and totalMaxDemand for the entire grid.

Surplus Allocation:

If Supply > totalBaseDemand:

Distribute the Surplus ($Supply - totalBaseDemand$) among nodes that have a "Hunger Delta" ($maxDemand - baseDemand > 0$).

Allocation is proportional to the node's individual contribution to the total grid hunger.

Deficit Allocation:

If Supply < totalBaseDemand:

Maintain existing proportional distribution based on baseDemand (standard brownout logic).

Bottleneck Resolution:

For each sink, calculate the ratio for each attribute: $Ratio_A = Provided_A / BaseDemand_A$.

The resulting efficiency = $\min(Ratio_{body}, Ratio_{mind}, Ratio_{social})$.

3.3 Integration & Propagation

File: src/game/systems/EnergyDistributionSystem.ts

Responsibility: Sync the resolved multipliers from the logic utility to the ECS runtime entities.

Logic: Ensure that the efficiency value passed into the UPDATE_POWER_SINK command is no longer clamped to $1.0$.

3.4 Blueprint Implementation (Data)

File: game_loop_v2.json

Responsibility: Update entity definitions to utilize the scaling logic.

Logic: - The work_progress rule must continue to use self.powerSink.efficiency \* global.dt.

Blueprints like logging or station_pot should define maxDemand values significantly higher than baseDemand to allow for overclocking.

4. Testing Plan

4.1 Unit Tests (Distribution Logic)

File: src/game/systems/energy/energyDistributionUtils.test.ts

Standard Baseline: Verify that $10/10$ provided power results in $1.0$ efficiency.

Overclocking: Verify that $100/10$ provided power (with $max=1000$) results in $10.0$ efficiency.

Bottlenecking: Verify that $100/10$ Mind and $5/10$ Social results in $0.5$ efficiency.

Surplus Sharing: Verify that two hungry nodes share surplus power according to their defined capacity.

4.2 Integration Tests (Throughput)

File: src/game/systems/EnergyDistributionSystem.test.ts

Given: A world with one resource producer and one power pool.

When: The power pool provides $5x$ the baseDemand.

Then: The producer's progress bar should fill $5x$ faster, resulting in 5 completions per standard cycle time.

5. Constraints & Non-Goals

Linearity: The relationship between power and speed is strictly linear. We do not use quadratic or logarithmic scaling for job speed.

Discrete completion: We do not modify ActionExecutor.ts. The "scaling" of output is achieved purely by the frequency of the fillbar completion, not by multiplying the values inside the TRANSFER actions.

Visuals: Vein thickness will reflect the actual power throughput (which may now be much higher), but the heartbeat frequency/logic remains a separate visual concern handled by the VeinManager.
