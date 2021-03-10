/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Land cover classification using GEE
/////////////////////////////////////////////////////////////////////////
//1. Study area 
//3. Image preprocessing 
///// 1. Import the Digital Elevation Model (DEM) layer 
var DEM = ee.Image('USGS/SRTMGL1_003').clip(region);
///// 2. Create the slope layer
var Slope = ee.Terrain.slope(DEM).rename('Slope');
///// 3. Import the Landsat images
// 3.1 filter the date, and the region
//ALL season
var start1 = '2015-01-01';//'YYYY-MM-DD'
var end1 = '2015-12-31';//'YYYY-MM-DD'
//var start2015='2015-01-01'
//var end2015='2015-12-31'

//import image collection
var L8_SR = imageCollection// or (LANDSAT/LT5_SR) for other years
   .filterBounds(region)//filter the date, and the region
   .filterDate(start1, end1)
//var L8_SR_2015 = ee.ImageCollection('LANDSAT/LC08/C01/T1_SR')// or (LANDSAT/LT5_SR) for other years
//  .filterBounds(region)//filter the date, and the region
//   .filterDate(start2015, end2015)

// 3.2 Apply cloud mask function
//Function to remove clouds - expects the new SR data to have a cfmask layer
//The Fmask classes, with their default visualization colors are:
//0 = clear (grey), 1 = water (blue), 2 = shadow (black), 3 = snow (cyan), and 4 = cloud (white)

function maskL8sr(image) {
  // Bits 3 and 5 are cloud shadow and cloud, respectively.
  var cloudShadowBitMask = (1 << 3);
  var snowBitMask = (1 << 4)
  var cloudsBitMask = (1 << 5);

  // Get the pixel QA band.
  var qa = image.select('pixel_qa');
  
  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudShadowBitMask).eq(0)
                 .and(qa.bitwiseAnd(cloudsBitMask).eq(0)).and(qa.bitwiseAnd(snowBitMask).eq(0));
  return image.updateMask(mask);
  
}
//function maskL8snowr(image) {
  // Bits 3 and 5 are cloud shadow and cloud, respectively.
//  var snowBitMask = (1 << 4);

  // Get the pixel QA band.
//   var qa = image.select('pixel_qa');
  
//   // Both flags should be set to zero, indicating clear conditions.
//   var mask = qa.bitwiseAnd(snowBitMask).neq(0)
//   return image.updateMask(mask);
  
// }
var L8_SR_CloudsFree = L8_SR.map(maskL8sr)
// var l8_snow_only=L8_SR.map(maskL8snowr).median()
// var L8_SR_CloudsFree_2015 = L8_SR_2015.map(maskL8sr)

// 2. function to add the Normalized Difference Built Index (NDBI)
// Landsat 5, and 7  ['B4','B3'] Landsat 8 ['B5','B4']

var addNDVI = function(image) {return image.addBands(image.normalizedDifference(['B5','B4']).rename('NDVI'))};
// 2. function to add the Normalized Difference Built Index (NDBI)
// Landsat 5, and 7  ['B5','B4'] Landsat 8 ['B6','B5']
// var addNDBI = function(image) {return image.addBands(image.normalizedDifference(['B6','B5']).rename('NDBI'))};
// // 3. function to add the Modified Normalized Difference Water Index (MNDWI)
// // Landsat 5, and 7 ['B2','B5'] Landsat 8 ['B3','B6']
// var addMNDWI = function(image) {return image.addBands(image.normalizedDifference(['B3','B6']).rename('MNDWI'))};


// 4. Apply all the indices functions over the image collection.
var L8_SR_indices = L8_SR_CloudsFree.map(addNDVI).median()
                          .select(['NDVI'],['NDVI'])
// var L8_SR_indices_2015 = L8_SR_CloudsFree_2015.map(addNDVI).map(addNDBI).map(addMNDWI). median()
//                           .select(['NDVI','NDBI','MNDWI'],['NDVI','NDBI','MNDWI'])


//4. Image classification and accuracy assessments
// 1. Create an image containing all bands for both seasons
// Select RBG bands ('Red','Blue','Green')
// Landsat 5, and 7  ['B5','B4'] Landsat 8 ['B4','B2','B3']
var L8_SR_RBG = L8_SR_CloudsFree.select(['B1','B2','B3','B4','B5','B6','B7']).median()
// var L8_SR_RBG_2015 = L8_SR_CloudsFree_2015.select(['B4','B2','B3','B6','B5','B7']).median()

// Overlay all image bands together
var All_Bands = L8_SR_RBG
      .addBands(L8_SR_indices)
      .addBands(DEM).addBands(Slope);
      
// var All_Bands_2015 = L8_SR_RBG_2015
//       .addBands(L8_SR_indices_2015)
//       .addBands(DEM).addBands(Slope);

print (All_Bands.bandNames());
print (All_Bands)
var Bands= ['B1','B2','B3','B4','B5','B6','B7','NDVI','elevation','Slope']
var vizParams = {
  bands: ['B3', 'B2', 'B1'],
  min: 0,
  max: 0.5,
  gamma: [0.75, 0.1, 1]
};
// Map.addLayer(All_Bands.clip(region), vizParams, 'true color composite');

//Export the image, specifying scale and region.
var sampleRegion = region;
// Export.image.toDrive({
//   image: l8_snow_only,
//   description:"snow",
//   scale: 30,
//   region:region,
//   maxPixels:3e10
// });

var classProperty="Landcover"
// 2. Divide the Reference data into Training (70%) and Testing (30%)

// Sample the composite to generate training data.  Note that the
// class label is stored in the 'landcover' property.
var training = All_Bands.sampleRegions({
  collection: buf_ref_data,
  properties: [classProperty],
  scale: 30
});

// Train a CART classifier.
// var classifier = ee.Classifier.smileCart().train({
//   features: training,
//   classProperty: classProperty,
// });
// // Print some info about the classifier (specific to CART).
// print('CART, explained', classifier.explain());

// Classify the composite.
// var classified = All_Bands.classify(classifier);
// Map.centerObject(buf_ref_data);
// Map.setCenter(83.955699, 28.206183, 11);
//Map.addLayer(classified.clip(region).focal_median(), {min: 1, max: 5, palette: ['#FF0000', '#0000FF', '#00FF00', '#808080','#FFFF00']},'Classified image of 2020 using cart');
// Optionally, do some accuracy assessment.  Fist, add a column of
// random uniforms to the training dataset.
// print (classified);
// var classified_2015 = All_Bands_2015.classify(classifier);
// Map.centerObject(FG);
// Map.setCenter(83.955699, 28.206183, 11);
//Map.addLayer(classified_2015.clip(region).focal_mode(), {min: 1, max: 5, palette: ['#FF0000','#0000FF', '#00FF00', '#808080', '#FFFF00']},'Classified image of 2015 using cart');


// Export.image.toDrive({
//   image: classified.focal_median(),
//   description:"Landcover_2020_cart_median",
//   scale: 30,
//   region:region,
//   maxPixels:3e10
// });
// Export.image.toDrive({
//   image: classified.focal_mode(),
//   description:"Landcover_2020_cart_mode",
//   scale: 30,
//   region:region,
//   maxPixels:3e10
// });

// Export.image.toDrive({
//   image: classified_2015.focal_median(),
//   description:"Landcover_2015_cart_median",
//   scale: 30,
//   region:region,
//   maxPixels:3e10
// });
// Export.image.toDrive({
//   image: classified_2015.focal_mode(),
//   description:"Landcover_2015_cart_mode",
//   scale: 30,
//   region:region,
//   maxPixels:3e10
// });

// Optionally, do some accuracy assessment.  Fist, add a column of
// random uniforms to the training dataset.
var withRandom = training.randomColumn('random');

// We want to reserve some of the data for testing, to avoid overfitting the model.
var split = 0.70

// var split1=0.3;  // Roughly 70% training, 30% testing.
var trainingPartition = withRandom.filter(ee.Filter.lt('random', split));
var testingPartition = withRandom.filter(ee.Filter.gte('random', split));

// Trained with 70% of our data.
var trainedClassifier = ee.Classifier.smileRandomForest(500).train({

  features: trainingPartition,
  classProperty: classProperty,
  inputProperties:Bands
});
var classified_random = All_Bands.classify(trainedClassifier);
// var classified_random_2010 = All_Bands_2015.classify(trainedClassifier);
 Map.addLayer(classified_random.clip(region).focal_median(), {min: 0, max: 1, palette: ['#00FF00', 'FF0000']},'Classified image of 2020 using random forest');
// Map.addLayer(classified_random_2010.clip(region).focal_median(), {min: 1, max: 5, palette: ['#FF0000', '#0000FF', '#00FF00', '#808080','#FFFF00']},'Classified image of 2015 using random forest');
// Classify the test FeatureCollection.
var test = testingPartition.classify(trainedClassifier);

// Print the confusion matrix.
var confusionMatrix = test.errorMatrix(classProperty, 'classification');
print('Confusion Matrix', confusionMatrix);
print('Validation overall accuracy: ', confusionMatrix.accuracy());
//Printing overall accuracy
var trainAccuracy = trainedClassifier.confusionMatrix();
print('Resubstitution error matrix: ', trainAccuracy);
print('Training overall accuracy: ', trainAccuracy.accuracy());
// kappa/f1 score
print('Validation consumer accuracy: ', confusionMatrix.consumersAccuracy());
print('Validation producer accuracy: ', confusionMatrix.producersAccuracy());
print('Kappa Coefficient: ', confusionMatrix.kappa());


//F1 score
var CA = confusionMatrix.consumersAccuracy().project([1]);
var PA = confusionMatrix.producersAccuracy().project([0]);
var F1 = (CA.multiply(PA).multiply(2.0)).divide(CA.add(PA))

print("F1 score:",F1);

//var testAccuracy = validated.errorMatrix('class', 'classification');
//print ('Validation accuracy exported to "Tasks"');
//print('Validation error matrix: ', testAccuracy);
//print('Validation overall accuracy: ', testAccuracy.accuracy());
// Add legend
// Create the panel for the legend items.
var legend = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '8px 15px'
  }
});

// Create and add the legend title.
var legendTitle = ui.Label({
  value: 'Legend',
  style: {
    fontWeight: 'bold',
    fontSize: '18px',
    margin: '0 0 4px 0',
    padding: '0'
  }
});
legend.add(legendTitle);

// Creates and styles 1 row of the legend.
var makeRow = function(color, name) {
  // Create the label that is actually the colored box.
  var colorBox = ui.Label({
    style: {
      backgroundColor: '#' + color,
      // Use padding to give the box height and width.
      padding: '8px',
      margin: '0 0 4px 0'
    }
  });

  // Create the label filled with the description text.
  var description = ui.Label({
    value: name,
    style: {margin: '0 0 4px 6px'}
  });

  return ui.Panel({
    widgets: [colorBox, description],
    layout: ui.Panel.Layout.Flow('horizontal')
  });
};

// legend.add(makeRow('FF0000', 'Urban'));
// legend.add(makeRow('00FF00', 'Vegetation'));
// legend.add(makeRow('0000FF', 'Water'));

legend.add(makeRow('00FF00', 'Forest'));
legend.add(makeRow('FF0000', 'Nonforest'));


// Add the legend to the map.
Map.add(legend);





//Export the image, specifying scale and region.
Export.image.toDrive({
  image: classified_random.focal_median(),
  description:"Landcover_random2015",
  scale: 30,
  region:region,
  maxPixels:3e10
});
Export.image.toDrive({
  image: classified_random.focal_mode(),
  description:"Landcover_random2015_mode",
  scale: 30,
  region:region,
  maxPixels:3e10
});
// var sampleRegion = FG;
// Export.image.toDrive({
//   image: l8_snow_only,
//   description:"snow",
//   scale: 30,
//   region:region,
//   maxPixels:3e10
// });
// Export.image.toDrive({
//   image: classified_random_2010.focal_median(),
//   description:"Landcover_random_2015",
//   scale: 30,
//   region:region,
//   maxPixels:3e10
// });
// Export.image.toDrive({
//   image: classified_random_2010.focal_mode(),
//   description:"Landcover_2015_random_mode",
//   scale: 30,
//   region:region,
//   maxPixels:3e10
// });

// Plot band values at points in an image.
// var L8_SR = ee.ImageCollection('LANDSAT/LC08/C01/T1_SR').filterDate('2020-01-01', '2020-08-30')

// var COLOR = {
//   built_up: 'ff0000',
// // grassland: '00ff00',
//   forest: '228B22',
//   water: '0000ff',
//   snow: 'add8e6',
//   rocky: '808080',
//   cultivation:'ffff00'
// };

// // 7 known locations.

// var kaskiPoints = ee.FeatureCollection([ built_up, forest,water,snow,rocky,cultivation]);
// var landsat8SR = L8_SR.filterBounds(kaskiPoints);

// var KaskiImage = ee.Image(landsat8SR.first());

// // Select bands B1 to B7.
// KaskiImage = KaskiImage.select(['B[1-7]']).divide(10000);

// var bandChart = ui.Chart.image.regions({
//   image: KaskiImage,
//   regions: kaskiPoints,
//   scale: 30,
//   seriesProperty: 'label'
// });
// bandChart.setChartType('LineChart');
// bandChart.setOptions({
//   title: 'Landsat 8 band values at 6 classes in kaski district',
//   hAxis: {
//     title: 'Band'
//   },
//   vAxis: {
//     title: 'Reflectance(%)'
//   },
//   lineWidth: 1,
//   pointSize: 4,
//   series: {
//     0: {color: COLOR.built_up},
//     //1: {color: COLOR.grassland},
//     1: {color: COLOR.forest},
//     2: {color: COLOR.water},
//     3: {color: COLOR.snow},
//     4: {color: COLOR.rocky},
//     5: {color: COLOR.cultivation}
//   }
// });

// // From: https://landsat.usgs.gov/what-are-best-spectral-bands-use-my-study
// var wavelengths = [.44, .48, .56, .65, .86, 1.61, 2.2];

// var spectraChart = ui.Chart.image.regions({
//   image: KaskiImage,
//   regions: kaskiPoints,
//   scale: 30,
//   seriesProperty: 'label',
//   xLabels: wavelengths
// });
// spectraChart.setChartType('LineChart');
// spectraChart.setOptions({
//   title: 'Landsat 8 Surfacereflectance spectra at  6 classes in kaski district',
//   hAxis: {
//     title: 'Wavelength (micrometers)'
//   },
//   vAxis: {
//     title: 'Reflectance(%)'
//   },
//   lineWidth: 1,
//   pointSize: 4,
//   series: {
//     0: {color: COLOR.built_up},
//     1: {color: COLOR.forest},
//     2: {color: COLOR.water},
//     3: {color: COLOR.snow},
//     4: {color: COLOR.rocky},
//     5: {color: COLOR.cultivation}
//   }
// });

// print(bandChart);
// print(spectraChart);
