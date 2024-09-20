# Fantasy pixel map generator


## This is official repository of Fantasy pixel map generator project. All new versions will be updated here.

### For now this `MD` file is just a test version of future releases.
____
### How physical map is generated:

```mermaid
flowchart TD
   A[Map configuration choice] --> E;
   B[Perlin noise generation] --> C[Perlin noise height application to terrain types];
   C --> D[River generation only on surface];
   D --> E[Map drawing using canvas];
```

_20.09.2024_
