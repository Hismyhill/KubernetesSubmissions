# Log output

## Description

This application generates a random string on startup and stores it in memory. It then outputs the string every 5 seconds with a timestamp.

## Installation

To install and run this application, follow these steps:

1. Clone the repository.
2. Install the dependencies with `pip install -r requirements.txt`.
3. Run the application with `python log-output.py`.

## Usage

To use the application, simply start it up and it will start outputting the random string every 5 seconds with a timestamp.

## Configuration

The following configuration options are available:

- `STRING_LENGTH`: The length of the random string to generate (default: 10).
- `OUTPUT_FORMAT`: The format of the output string (default: `"{timestamp} - {string}"`).

To configure the application, create a `config.ini` file in the same directory as the application with the following format:

```ini
[RandomStringGenerator]
STRING_LENGTH = 20
OUTPUT_FORMAT = "{timestamp} - {string} (length: {string_length})"
```
