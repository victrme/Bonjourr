/** Retreive EXIF, IPTC, and XMP info from an image */
export async function getExif(img: Blob): Promise<Record<string, unknown>> {
	const buffer = await img.arrayBuffer()
	const exif = findEXIFinJPEG(buffer)


	return exif
}

function findEXIFinJPEG(file: ArrayBuffer): Record<string, unknown> {
	const dataView = new DataView(file)

	if (dataView.getUint8(0) !== 0xff || dataView.getUint8(1) !== 0xd8) {
		throw new Error('Not a valid jpeg')
	}

	const length = file.byteLength
	let offset = 2

	while (offset < length) {
		// not a valid marker, something is wrong
		if (dataView.getUint8(offset) !== 0xff) {
			console.warn('Not a valid marker')
			return {}
		}

		const marker = dataView.getUint8(offset + 1)

		// we could implement handling for other markers here,
		// but we're only looking for 0xFFE1 for EXIF data

		if (marker === 225) {
			return readEXIFData(dataView, offset + 4) //, dataView.getUint16(offset + 2) - 2))

			// offset += 2 + buffer.getShortAt(offset+2, true);
		}

		offset += 2 + dataView.getUint16(offset + 2)
	}

	return {}
}

function readTags(
	file: DataView,
	tiffStart: number,
	dirStart: number,
	strings: Record<string, string>,
	bigEnd: boolean,
): Record<string, unknown> {
	const entries = file.getUint16(dirStart, !bigEnd)
	const tags: Record<string, unknown> = {}
	let entryOffset = 0

	for (let i = 0; i < entries; i++) {
		entryOffset = dirStart + i * 12 + 2
		const tag = strings[file.getUint16(entryOffset, !bigEnd)]

		tags[tag] = readTagValue(file, entryOffset, tiffStart, dirStart, bigEnd)
	}

	return tags
}

function readTagValue(file: DataView, entryOffset: number, tiffStart: number, _dirStart: number, bigEnd: boolean) {
	const type = file.getUint16(entryOffset + 2, !bigEnd)
	const numValues = file.getUint32(entryOffset + 4, !bigEnd)
	const valueOffset = file.getUint32(entryOffset + 8, !bigEnd) + tiffStart
	let offset = 0

	switch (type) {
		// byte, 8-bit unsigned int
		// undefined, 8-bit byte, value depending on field
		case 1:
		case 7: {
			if (numValues === 1) {
				return file.getUint8(entryOffset + 8)
			}

			offset = numValues > 4 ? valueOffset : entryOffset + 8
			const vals: number[] = []

			for (let n = 0; n < numValues; n++) {
				vals[n] = file.getUint8(offset + n)
			}
			return vals
		}

		// ascii, 8-bit byte
		case 2: {
			offset = numValues > 4 ? valueOffset : entryOffset + 8
			return getStringFromDB(file, offset, numValues - 1)
		}

		// short, 16 bit int
		case 3: {
			if (numValues === 1) {
				return file.getUint16(entryOffset + 8, !bigEnd)
			}

			offset = numValues > 2 ? valueOffset : entryOffset + 8
			const vals: number[] = []

			for (let n = 0; n < numValues; n++) {
				vals[n] = file.getUint16(offset + 2 * n, !bigEnd)
			}
			return vals
		}

		// long, 32 bit int
		case 4: {
			if (numValues === 1) {
				return file.getUint32(entryOffset + 8, !bigEnd)
			}

			const vals: number[] = []

			for (let n = 0; n < numValues; n++) {
				vals[n] = file.getUint32(valueOffset + 4 * n, !bigEnd)
			}
			return vals
		}

		// rational = two long values, first is numerator, second is denominator
		case 5: {
			if (numValues === 1) {
				const numerator = file.getUint32(valueOffset, !bigEnd)
				const denominator = file.getUint32(valueOffset + 4, !bigEnd)
				const val = Number(numerator / denominator)
				return val
			}

			const vals: number[] = []

			for (let n = 0; n < numValues; n++) {
				const numerator = file.getUint32(valueOffset + 8 * n, !bigEnd)
				const denominator = file.getUint32(valueOffset + 4 + 8 * n, !bigEnd)
				vals[n] = Number(numerator / denominator)
			}

			return vals
		}

		// slong, 32 bit signed int
		case 9: {
			if (numValues === 1) {
				return file.getInt32(entryOffset + 8, !bigEnd)
			}

			const vals: number[] = []

			for (let n = 0; n < numValues; n++) {
				vals[n] = file.getInt32(valueOffset + 4 * n, !bigEnd)
			}
			return vals
		}

		// signed rational, two slongs, first is numerator, second is denominator
		case 10: {
			if (numValues === 1) {
				return file.getInt32(valueOffset, !bigEnd) / file.getInt32(valueOffset + 4, !bigEnd)
			}

			const vals: number[] = []

			for (let n = 0; n < numValues; n++) {
				vals[n] = file.getInt32(valueOffset + 8 * n, !bigEnd) / file.getInt32(valueOffset + 4 + 8 * n, !bigEnd)
			}
			return vals
		}

		default:
	}
}

function getStringFromDB(buffer: DataView, start: number, length: number): string {
	let outstr = ''

	for (let n = start; n < start + length; n++) {
		outstr += String.fromCharCode(buffer.getUint8(n))
	}

	return outstr
}

function readEXIFData(dataview: DataView, start: number): Record<string, unknown> {
	if (getStringFromDB(dataview, start, 4) !== 'Exif') {
		return {}
	}

	const tiffOffset = start + 6
	let bigEnd = false

	// test for TIFF validity and endianness
	if (dataview.getUint16(tiffOffset) === 0x4949) {
		bigEnd = false
	} else if (dataview.getUint16(tiffOffset) === 0x4d4d) {
		bigEnd = true
	} else {
		return {}
	}

	if (dataview.getUint16(tiffOffset + 2, !bigEnd) !== 0x002a) {
		return {}
	}

	const firstIFDOffset = dataview.getUint32(tiffOffset + 4, !bigEnd)

	if (firstIFDOffset < 0x00000008) {
		return {}
	}

	const tags = readTags(dataview, tiffOffset, tiffOffset + firstIFDOffset, TiffTags, bigEnd)

	if (typeof tags.ExifIFDPointer === 'number') {
		const exifData = readTags(dataview, tiffOffset, tiffOffset + tags.ExifIFDPointer, ExifTags, bigEnd) as Record<
			string,
			string
		>

		for (const tag in exifData) {
			switch (tag) {
				case 'LightSource':
				case 'Flash':
				case 'MeteringMode':
				case 'ExposureProgram':
				case 'SensingMethod':
				case 'SceneCaptureType':
				case 'SceneType':
				case 'CustomRendered':
				case 'WhiteBalance':
				case 'GainControl':
				case 'Contrast':
				case 'Saturation':
				case 'Sharpness':
				case 'SubjectDistanceRange':
				case 'FileSource':
					exifData[tag] = StringValues[tag][exifData[tag]]
					break

				case 'ExifVersion':
				case 'FlashpixVersion':
					exifData[tag] = String.fromCharCode(
						Number.parseInt(exifData[tag][0]),
						Number.parseInt(exifData[tag][1]),
						Number.parseInt(exifData[tag][2]),
						Number.parseInt(exifData[tag][3]),
					)
					break

				case 'ComponentsConfiguration':
					exifData[tag] =
						StringValues.Components[exifData[tag][0]] +
						StringValues.Components[exifData[tag][1]] +
						StringValues.Components[exifData[tag][2]] +
						StringValues.Components[exifData[tag][3]]
					break

				default:
			}

			tags[tag] = exifData[tag]
		}
	}

	return tags
}

const ExifTags: Record<string, string> = {
	// colorspace tags
	40961: 'ColorSpace', // Color space information tag

	// date and time
	36867: 'DateTimeOriginal', // Date and time when the original image was generated
	36868: 'DateTimeDigitized', // Date and time when the image was stored digitally
	37520: 'SubsecTime', // Fractions of seconds for DateTime
	37521: 'SubsecTimeOriginal', // Fractions of seconds for DateTimeOriginal
	37522: 'SubsecTimeDigitized', // Fractions of seconds for DateTimeDigitized

	// picture-taking conditions
	33434: 'ExposureTime', // Exposure time (in seconds)
	33437: 'FNumber', // F number
	34850: 'ExposureProgram', // Exposure program
	34852: 'SpectralSensitivity', // Spectral sensitivity
	34855: 'ISOSpeedRatings', // ISO speed rating
	34856: 'OECF', // Optoelectric conversion factor
	37377: 'ShutterSpeedValue', // Shutter speed
	37378: 'ApertureValue', // Lens aperture
	37379: 'BrightnessValue', // Value of brightness
	37380: 'ExposureBias', // Exposure bias
	37381: 'MaxApertureValue', // Smallest F number of lens
	37382: 'SubjectDistance', // Distance to subject in meters
	37383: 'MeteringMode', // Metering mode
	37384: 'LightSource', // Kind of light source
	37385: 'Flash', // Flash status
	37396: 'SubjectArea', // Location and area of main subject
	37386: 'FocalLength', // Focal length of the lens in mm
	41483: 'FlashEnergy', // Strobe energy in BCPS
	41484: 'SpatialFrequencyResponse', //
	41486: 'FocalPlaneXResolution', // Number of pixels in width direction per FocalPlaneResolutionUnit
	41487: 'FocalPlaneYResolution', // Number of pixels in height direction per FocalPlaneResolutionUnit
	41488: 'FocalPlaneResolutionUnit', // Unit for measuring FocalPlaneXResolution and FocalPlaneYResolution
	41492: 'SubjectLocation', // Location of subject in image
	41493: 'ExposureIndex', // Exposure index selected on camera
	41495: 'SensingMethod', // Image sensor type
	41728: 'FileSource', // Image source (3 == DSC)
	41729: 'SceneType', // Scene type (1 == directly photographed)
	41730: 'CFAPattern', // Color filter array geometric pattern
	41985: 'CustomRendered', // Special processing
	41986: 'ExposureMode', // Exposure mode
	41987: 'WhiteBalance', // 1 = auto white balance, 2 = manual
	41988: 'DigitalZoomRation', // Digital zoom ratio
	41989: 'FocalLengthIn35mmFilm', // Equivalent foacl length assuming 35mm film camera (in mm)
	41990: 'SceneCaptureType', // Type of scene
	41991: 'GainControl', // Degree of overall image gain adjustment
	41992: 'Contrast', // Direction of contrast processing applied by camera
	41993: 'Saturation', // Direction of saturation processing applied by camera
	41994: 'Sharpness', // Direction of sharpness processing applied by camera
	41995: 'DeviceSettingDescription', //
	41996: 'SubjectDistanceRange', // Distance to subject

	// other tags
	40965: 'InteroperabilityIFDPointer',
	42016: 'ImageUniqueID', // Identifier assigned uniquely to each image
}

const TiffTags: Record<string, string> = {
	256: 'ImageWidth',
	257: 'ImageHeight',
	34665: 'ExifIFDPointer',
	34853: 'GPSInfoIFDPointer',
	40965: 'InteroperabilityIFDPointer',
	258: 'BitsPerSample',
	259: 'Compression',
	262: 'PhotometricInterpretation',
	274: 'Orientation',
	277: 'SamplesPerPixel',
	284: 'PlanarConfiguration',
	530: 'YCbCrSubSampling',
	531: 'YCbCrPositioning',
	282: 'XResolution',
	283: 'YResolution',
	296: 'ResolutionUnit',
	273: 'StripOffsets',
	278: 'RowsPerStrip',
	279: 'StripByteCounts',
	513: 'JPEGInterchangeFormat',
	514: 'JPEGInterchangeFormatLength',
	301: 'TransferFunction',
	318: 'WhitePoint',
	319: 'PrimaryChromaticities',
	529: 'YCbCrCoefficients',
	532: 'ReferenceBlackWhite',
	306: 'DateTime',
	270: 'ImageDescription',
	271: 'Make',
	272: 'Model',
	305: 'Software',
	315: 'Artist',
	33432: 'Copyright',
}

const GPSTags: Record<string, string> = {
	0: 'GPSVersionID',
	1: 'GPSLatitudeRef',
	2: 'GPSLatitude',
	3: 'GPSLongitudeRef',
	4: 'GPSLongitude',
	5: 'GPSAltitudeRef',
	6: 'GPSAltitude',
	7: 'GPSTimeStamp',
	8: 'GPSSatellites',
	9: 'GPSStatus',
	10: 'GPSMeasureMode',
	11: 'GPSDOP',
	12: 'GPSSpeedRef',
	13: 'GPSSpeed',
	14: 'GPSTrackRef',
	15: 'GPSTrack',
	16: 'GPSImgDirectionRef',
	17: 'GPSImgDirection',
	18: 'GPSMapDatum',
	19: 'GPSDestLatitudeRef',
	20: 'GPSDestLatitude',
	21: 'GPSDestLongitudeRef',
	22: 'GPSDestLongitude',
	23: 'GPSDestBearingRef',
	24: 'GPSDestBearing',
	25: 'GPSDestDistanceRef',
	26: 'GPSDestDistance',
	27: 'GPSProcessingMethod',
	28: 'GPSAreaInformation',
	29: 'GPSDateStamp',
	30: 'GPSDifferential',
}

const StringValues: Record<string, Record<string, string>> = {
	ExposureProgram: {
		0: 'Not defined',
		1: 'Manual',
		2: 'Normal program',
		3: 'Aperture priority',
		4: 'Shutter priority',
		5: 'Creative program',
		6: 'Action program',
		7: 'Portrait mode',
		8: 'Landscape mode',
	},
	MeteringMode: {
		0: 'Unknown',
		1: 'Average',
		2: 'CenterWeightedAverage',
		3: 'Spot',
		4: 'MultiSpot',
		5: 'Pattern',
		6: 'Partial',
		255: 'Other',
	},
	LightSource: {
		0: 'Unknown',
		1: 'Daylight',
		2: 'Fluorescent',
		3: 'Tungsten (incandescent light)',
		4: 'Flash',
		9: 'Fine weather',
		10: 'Cloudy weather',
		11: 'Shade',
		12: 'Daylight fluorescent (D 5700 - 7100K)',
		13: 'Day white fluorescent (N 4600 - 5400K)',
		14: 'Cool white fluorescent (W 3900 - 4500K)',
		15: 'White fluorescent (WW 3200 - 3700K)',
		17: 'Standard light A',
		18: 'Standard light B',
		19: 'Standard light C',
		20: 'D55',
		21: 'D65',
		22: 'D75',
		23: 'D50',
		24: 'ISO studio tungsten',
		255: 'Other',
	},
	Flash: {
		0: 'Flash did not fire',
		1: 'Flash fired',
		5: 'Strobe return light not detected',
		7: 'Strobe return light detected',
		9: 'Flash fired, compulsory flash mode',
		13: 'Flash fired, compulsory flash mode, return light not detected',
		15: 'Flash fired, compulsory flash mode, return light detected',
		16: 'Flash did not fire, compulsory flash mode',
		24: 'Flash did not fire, auto mode',
		25: 'Flash fired, auto mode',
		29: 'Flash fired, auto mode, return light not detected',
		31: 'Flash fired, auto mode, return light detected',
		32: 'No flash function',
		65: 'Flash fired, red-eye reduction mode',
		69: 'Flash fired, red-eye reduction mode, return light not detected',
		71: 'Flash fired, red-eye reduction mode, return light detected',
		73: 'Flash fired, compulsory flash mode, red-eye reduction mode',
		77: 'Flash fired, compulsory flash mode, red-eye reduction mode, return light not detected',
		79: 'Flash fired, compulsory flash mode, red-eye reduction mode, return light detected',
		89: 'Flash fired, auto mode, red-eye reduction mode',
		93: 'Flash fired, auto mode, return light not detected, red-eye reduction mode',
		95: 'Flash fired, auto mode, return light detected, red-eye reduction mode',
	},
	SensingMethod: {
		1: 'Not defined',
		2: 'One-chip color area sensor',
		3: 'Two-chip color area sensor',
		4: 'Three-chip color area sensor',
		5: 'Color sequential area sensor',
		7: 'Trilinear sensor',
		8: 'Color sequential linear sensor',
	},
	SceneCaptureType: {
		0: 'Standard',
		1: 'Landscape',
		2: 'Portrait',
		3: 'Night scene',
	},
	SceneType: {
		1: 'Directly photographed',
	},
	CustomRendered: {
		0: 'Normal process',
		1: 'Custom process',
	},
	WhiteBalance: {
		0: 'Auto white balance',
		1: 'Manual white balance',
	},
	GainControl: {
		0: 'None',
		1: 'Low gain up',
		2: 'High gain up',
		3: 'Low gain down',
		4: 'High gain down',
	},
	Contrast: {
		0: 'Normal',
		1: 'Soft',
		2: 'Hard',
	},
	Saturation: {
		0: 'Normal',
		1: 'Low saturation',
		2: 'High saturation',
	},
	Sharpness: {
		0: 'Normal',
		1: 'Soft',
		2: 'Hard',
	},
	SubjectDistanceRange: {
		0: 'Unknown',
		1: 'Macro',
		2: 'Close view',
		3: 'Distant view',
	},
	FileSource: {
		3: 'DSC',
	},

	Components: {
		0: '',
		1: 'Y',
		2: 'Cb',
		3: 'Cr',
		4: 'R',
		5: 'G',
		6: 'B',
	},
}
