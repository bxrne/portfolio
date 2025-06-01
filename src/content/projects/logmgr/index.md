---
title: "logmgr"
description: "Go lib for fast, structured but minimal setup of logging"
date: "Jun 1 2025"
demoURL: "https://pkg.go.dev/github.com/bxrne/logmgr"
repoURL: "https://github.com/bxrne/logmgr"
---

![example output](https://github.com/bxrne/logmgr/raw/main/example.png)

I got sick of creating a `internal/logger/logger.go` file in every project, so I made a library that takes the configuration away and goes via convention.
It needed to be fast and structured (so Grafana, ELK and Loki will work straight away) and the only thing i *need* to configure is the log level. Time is just set to be RFC3339Nano, which is fine. Rather than initialising loggers i wanted to use a log manager (shift the init overhead to the library) - if I have to create a handler/client around a library implementation, something ain't right. Written in Go v1.24.

Another annoyance was how even though multi writers are supported by other loggers they often have a non intuitive implementation.
By default this logger will not log anywhere, you must add syncs (console, file, async file) to the logger. This allows for a more flexible setup and avoids unnecessary overhead. Technically there is no limit but if it is more than 2 reconsider your previous decisions.

## Example

How one could use this library in a project:

```go 
package main

import (
	"time"

	"github.com/bxrne/logmgr"
)

func main() {
	// Initialize the logger
	logmgr.SetLevel(logmgr.DebugLevel) // Set the desired log level (optional)

	// Add sinks for output
	logmgr.AddSink(logmgr.DefaultConsoleSink) // Console output

	// Add file sink with rotation (24 hours, 100MB max)
	fileSink, err := logmgr.NewFileSink("app.log", 24*time.Hour, 100*1024*1024)
	if err != nil {
		panic(err)
	}

	// Add file sink to the logger
	logmgr.AddSink(fileSink)

	// Add async file sink for high performance
	asyncSink, err := logmgr.NewAsyncFileSink("async.log", 24*time.Hour, 100*1024*1024, 1000)
	if err != nil {
		panic(err)
	}
	logmgr.AddSink(asyncSink)

	// Log a debug message
	logmgr.Debug("This is a debug message")

	// Log an info message with structured fields
	logmgr.Info("User logged in",
		logmgr.Field("user_id", 12345),
		logmgr.Field("action", "login"),
		logmgr.Field("ip", "192.168.1.1"),
	)

	// Log a warning message with structured fields
	logmgr.Warn("High memory usage",
		logmgr.Field("memory_percent", 85.5),
		logmgr.Field("threshold", 80.0),
	)

	// Log an error message with structured fields
	logmgr.Error("Database connection failed",
		logmgr.Field("error", "connection timeout"),
		logmgr.Field("host", "db.example.com"),
		logmgr.Field("port", 5432),
		logmgr.Field("retries", 3),
	)

	// Example of API request logging
	logmgr.Info("API request processed",
		logmgr.Field("method", "POST"),
		logmgr.Field("path", "/api/users"),
		logmgr.Field("status_code", 201),
		logmgr.Field("duration_ms", 45.67),
		logmgr.Field("user_id", 12345),
		logmgr.Field("request_id", "req-abc-123"),
	)

	// Example of conditional debug logging
	if logmgr.GetLevel() <= logmgr.DebugLevel {
		logmgr.Debug("Detailed debug info",
			logmgr.Field("internal_state", "processing"),
			logmgr.Field("memory_usage", "45MB"),
		)
	}

	// Gracefully shutdown to flush all logs
	logmgr.Shutdown()

	// Fatal would call os.Exit(1) after flushing logs - commented out for demo
	// logmgr.Fatal("Critical system failure",
	//   logmgr.Field("error", "out of memory"),
	//   logmgr.Field("available_memory", "0MB"),
	// )
}
```


## Architectural Highlights

### Lock-Free Ring Buffer

At the heart of logmgr is a custom lock-free ring buffer that uses atomic operations for thread-safe, high-performance log entry queuing:

```go
type RingBuffer struct {
    buffer   []unsafe.Pointer // Ring buffer of entry pointers
    mask     uint64           // Size mask (size must be power of 2)
    writePos uint64           // Write position (atomic)
    readPos  uint64           // Read position (atomic)
}
```

This design ensures that log operations are non-blocking and scale linearly with the number of cores.

### Object Pool Optimization

logmgr uses `sync.Pool` to reuse log entry objects, dramatically reducing garbage collection pressure:

```go
entryPool: sync.Pool{
    New: func() interface{} {
        return &Entry{
            Fields: make(map[string]interface{}, 8),
            buffer: make([]byte, 0, 512),
        }
    },
}
```

### Background Workers

Multiple background workers (one per CPU core) continuously drain the ring buffer and write to configured sinks, keeping the hot path as fast as possible.

### Custom JSON Serialization

logmgr includes a highly optimized JSON marshaler that avoids reflection and minimizes allocations:

```go
func (e *Entry) MarshalJSON() ([]byte, error) {
    e.buffer = e.buffer[:0]
    e.buffer = append(e.buffer, '{')
    
    // Direct string manipulation for maximum performance
    e.buffer = append(e.buffer, `"level":"`...)
    e.buffer = append(e.buffer, e.Level.String()...)
    // ... continues with optimized field serialization
}
```

## Comprehensive Benchmark Results

We conducted extensive benchmarks comparing logmgr against the most popular Go logging libraries. All tests were run on a MacBook Pro with an Intel Core i9-9980HK CPU @ 2.40GHz.

### Complete Benchmark Results

Here are the complete benchmark results from our test suite:

```
goos: darwin
goarch: amd64
pkg: github.com/bxrne/logmgr
cpu: Intel(R) Core(TM) i9-9980HK CPU @ 2.40GHz

Benchmarklogmgr_Simple-16                6551541               160.6 ns/op           144 B/op          2 allocs/op
Benchmarklogmgr_Structured-16            3044401               429.6 ns/op           440 B/op          4 allocs/op
BenchmarkZap_Simple-16                  20303310                55.96 ns/op            0 B/op          0 allocs/op
BenchmarkZap_Structured-16               4970788               243.3 ns/op           258 B/op          1 allocs/op
BenchmarkLogrus_Simple-16                 622810              2217 ns/op             883 B/op         19 allocs/op
BenchmarkLogrus_Structured-16             320115              3723 ns/op            1913 B/op         32 allocs/op
BenchmarkStdLog_Simple-16                6494241               187.9 ns/op             0 B/op          0 allocs/op
BenchmarkSlog_Simple-16                  7147566               148.4 ns/op             0 B/op          0 allocs/op
BenchmarkSlog_Structured-16              4235157               276.1 ns/op           192 B/op          4 allocs/op
Benchmarklogmgr_LevelFiltering-16       1000000000               0.4803 ns/op          0 B/op          0 allocs/op
BenchmarkZap_LevelFiltering-16          1000000000               0.8132 ns/op          0 B/op          0 allocs/op
BenchmarkLogrus_LevelFiltering-16       1000000000               0.2787 ns/op          0 B/op          0 allocs/op
BenchmarkSlog_LevelFiltering-16         1000000000               0.8582 ns/op          0 B/op          0 allocs/op
Benchmarklogmgr_Allocations-16           4276648               272.9 ns/op           432 B/op          3 allocs/op
BenchmarkZap_Allocations-16              2182059               551.7 ns/op           128 B/op          1 allocs/op
BenchmarkLogrus_Allocations-16            469026              2585 ns/op            1765 B/op         27 allocs/op
BenchmarkSlog_Allocations-16             1479810               819.7 ns/op            96 B/op          2 allocs/op
BenchmarkConcurrentLogging-16            8073288               126.8 ns/op           440 B/op          4 allocs/op
```

#### Benchmark Interpretation

- **ns/op**: Nanoseconds per operation (lower is better)
- **B/op**: Bytes allocated per operation (lower is better)
- **allocs/op**: Number of allocations per operation (lower is better)

### Trade-offs

1. **Memory Usage**: Slightly higher memory usage due to asynchronous buffering
2. **Complexity**: More complex internals compared to synchronous loggers
3. **Allocation Count**: Object pooling strategy results in more allocations than zero-allocation approaches

## CI/CD

### Integration
- Check package passes linters
- Run tests that must pass 
- Run CodeQL (actions, go) via Github Advanced Security
- Run Github Copilot Pull Request Review
- SonarQube Cloud
- Dependabot 

### Deployment
- Build application
- Calculate SemVer number via commit messages (Conventional Commits)
    - Generate CHANGELOG.md 
    - Create GitHub Release
    - Tag release commit 

