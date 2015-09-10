# Interactive EMS
An Interactive Experiment Management System for the [Moses Toolkit](https://github.com/moses-smt).

A project at the [Machine Translation Marathon 2015](http://ufal.mff.cuni.cz/mtm15).

## Installation

The IEMS should run fine in any modern web browser if you just download it and open **index.html**.

But just in case it doesn't - put it on a server or localhost and try using Google Chrome.

For compatibility with the Moses Toolkit all binaries and scripts from Moses should be located in **/your/path/tools/** folder and the makefile generated with IEMS in **/your/path/Makefile**

## Build

You'll need node.js.

Install babel

```
npm install -g babel
```

Transform JavaScript

```
babel --out-file dist/app.js js/app
```

While developing run

```
babel --watch --source-maps inline --out-file dist/app.js js/app
```

## Description

* On the left there is a toolbox with all currently supported Moses processes
* The rest is a canvas for manipulations with the processes and an output window for the makefile
* The rectangles represent simple or more complex processes of Moses
* The circles on the upper part of a rectangle represent input data
* The circles on the lower part of a rectangle represent output data

## Usage

* Drag & drop processes to the canvas
* Connect the data circles where appropriate
* The shell commands will be automatically generated on the bottom of the screen
* Copy the contents, save as a makefile, run make
* For now there is no validation so inspect the workflow of your experiment on your own
